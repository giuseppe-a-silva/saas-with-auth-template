import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DispatcherFactory } from '../dispatchers/dispatcher.factory';
import {
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
  NotificationStatus,
} from '../interfaces/notification-dispatcher.interface';
import { SendNotificationData } from '../types/notification.types';
import { NotificationTemplateService } from './notification-template.service';
import { RetryContext, RetryService } from './retry.service';
import { TemplateRendererService } from './template-renderer.service';

/**
 * Interface para template retornado pelo serviço
 */
interface TemplateData {
  id: string;
  name: string;
  category: string;
  channel: string;
  content: string;
  isActive: boolean;
}

/**
 * Service principal de notificações
 * Orquestra todo o processo de envio: busca template, renderiza e envia
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly templateService: NotificationTemplateService,
    private readonly rendererService: TemplateRendererService,
    private readonly dispatcherFactory: DispatcherFactory,
    private readonly configService: ConfigService,
    private readonly retryService: RetryService,
  ) {
    // Inicia processamento de retry em background
    this.startRetryProcessor();
  }

  /**
   * Envia uma notificação usando um template
   * @param notificationData Dados da notificação
   * @param notificationId ID único (opcional, será gerado se não fornecido)
   * @returns Resultado do envio
   */
  async sendNotification(
    notificationData: SendNotificationData,
    notificationId?: string,
  ): Promise<NotificationResult> {
    const id = notificationId ?? this.generateNotificationId();

    try {
      this.logger.log('Iniciando envio de notificação', {
        notificationId: id,
        templateName: notificationData.templateName,
        recipient: notificationData.recipient.email,
      });

      // 1. Busca o template
      const template = (await this.templateService.findTemplateByName(
        notificationData.templateName,
      )) as TemplateData;

      if (!template.isActive) {
        throw new Error('Template está inativo e não pode ser usado');
      }

      // 2. Verifica se o canal está disponível
      const isChannelAvailable =
        await this.dispatcherFactory.isChannelAvailable(
          template.channel as NotificationChannel,
        );

      if (!isChannelAvailable) {
        throw new Error(`Canal ${template.channel} não está disponível`);
      }

      // 3. Prepara dados para renderização
      const renderData = {
        user: notificationData.recipient,
        data: notificationData.data,
        meta: {
          origin: 'notification-service',
          ...(notificationData.meta ?? {}),
        },
      };

      // 4. Renderiza o template
      const renderedContent = await this.rendererService.renderTemplate(
        template.content,
        renderData,
      );

      // 5. Prepara payload para o dispatcher
      const payload: NotificationPayload = {
        event: `${template.category}.${template.name}`,
        category: template.category,
        timestamp: new Date().toISOString(),
        recipient: notificationData.recipient,
        data: renderData.data,
        meta: renderData.meta,
      };

      // 6. Obtém o dispatcher e envia
      const dispatcher = this.dispatcherFactory.getDispatcher(
        template.channel as NotificationChannel,
      );

      const result = await dispatcher.send(renderedContent, payload);

      // 7. Processa resultado
      this.processNotificationResult(
        id,
        template,
        notificationData,
        payload,
        result,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error('Erro ao enviar notificação', {
        notificationId: id,
        templateName: notificationData.templateName,
        recipient: notificationData.recipient.email,
        error: errorMessage,
      });

      const failureResult: NotificationResult = {
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata: {
          service: 'notification-service',
        },
      };

      // Registra falha para retry se habilitado
      const enableRetry = this.configService.get<boolean>(
        'NOTIFICATION_RETRY_ENABLED',
        true,
      );

      if (enableRetry && !notificationId) {
        // Só registra para retry se não for uma tentativa de retry
        try {
          const template = (await this.templateService.findTemplateByName(
            notificationData.templateName,
          )) as TemplateData;

          this.retryService.registerFailure(
            id,
            template.name,
            template.channel,
            notificationData.recipient.email,
            notificationData,
            failureResult,
          );
        } catch (retryError) {
          const retryErrorMessage =
            retryError instanceof Error
              ? retryError.message
              : 'Erro desconhecido';
          this.logger.error('Erro ao registrar falha para retry', {
            notificationId: id,
            error: retryErrorMessage,
          });
        }
      }

      return failureResult;
    }
  }

  /**
   * Processa o resultado de uma notificação (sucesso ou falha)
   * @param notificationId ID da notificação
   * @param template Template usado
   * @param notificationData Dados originais
   * @param payload Payload enviado
   * @param result Resultado do envio
   */
  private processNotificationResult(
    notificationId: string,
    template: TemplateData,
    notificationData: SendNotificationData,
    payload: NotificationPayload,
    result: NotificationResult,
  ): void {
    if (result.status === NotificationStatus.SENT) {
      this.logger.log('Notificação enviada com sucesso', {
        notificationId,
        templateName: template.name,
        channel: template.channel,
        recipient: notificationData.recipient.email,
        externalId: result.externalId,
      });
    } else {
      this.logger.warn('Falha no envio da notificação', {
        notificationId,
        templateName: template.name,
        channel: template.channel,
        recipient: notificationData.recipient.email,
        error: result.error,
      });

      // Registra falha para retry
      const enableRetry = this.configService.get<boolean>(
        'NOTIFICATION_RETRY_ENABLED',
        true,
      );

      if (enableRetry) {
        this.retryService.registerFailure(
          notificationId,
          template.name,
          template.channel,
          notificationData.recipient.email,
          notificationData,
          result,
        );
      }
    }

    // Registra auditoria
    this.logNotificationAudit(template, notificationData, result);
  }

  /**
   * Processa retries pendentes
   * Chamado automaticamente em background
   */
  async processRetries(): Promise<void> {
    const readyForRetry = this.retryService.getNotificationsReadyForRetry();

    if (readyForRetry.length === 0) {
      return;
    }

    this.logger.log('Processando retries pendentes', {
      count: readyForRetry.length,
    });

    for (const context of readyForRetry) {
      try {
        this.logger.log('Executando retry', {
          notificationId: context.id,
          attemptNumber: context.attempts.length + 1,
          templateName: context.templateName,
        });

        // Re-envia a notificação usando o payload original
        const result = await this.sendNotification(
          context.originalPayload,
          context.id, // Mantém o mesmo ID para vincular ao retry
        );

        // Registra resultado do retry
        this.retryService.registerRetryAttempt(context.id, result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';

        this.logger.error('Erro durante retry', {
          notificationId: context.id,
          error: errorMessage,
        });

        // Registra erro do retry
        this.retryService.registerRetryAttempt(context.id, {
          status: NotificationStatus.FAILED,
          error: errorMessage,
          metadata: { retryError: true },
        });
      }
    }
  }

  /**
   * Obtém estatísticas de retry
   * @returns Estatísticas do sistema de retry
   */
  getRetryStatistics(): {
    pending: number;
    retrying: number;
    success: number;
    failed: number;
    total: number;
  } {
    const contexts = this.retryService.getAllRetryContexts();

    return {
      pending: contexts.filter((c) => c.status === 'pending').length,
      retrying: contexts.filter((c) => c.status === 'retrying').length,
      success: contexts.filter((c) => c.status === 'success').length,
      failed: contexts.filter((c) => c.status === 'failed').length,
      total: contexts.length,
    };
  }

  /**
   * Lista contexts de retry com filtros
   * @param status Filtro por status
   * @returns Array de contexts
   */
  getRetryContexts(status?: string): RetryContext[] {
    const contexts = this.retryService.getAllRetryContexts();

    if (status) {
      return contexts.filter((c) => c.status === status);
    }

    return contexts;
  }

  /**
   * Inicia processamento automático de retry em background
   */
  private startRetryProcessor(): void {
    const intervalMs = this.configService.get<number>(
      'NOTIFICATION_RETRY_PROCESSOR_INTERVAL',
      30000, // 30 segundos por padrão
    );

    setInterval(() => {
      void (async (): Promise<void> => {
        try {
          await this.processRetries();

          // Cleanup automático de contexts antigos
          const cleanupHours = this.configService.get<number>(
            'NOTIFICATION_RETRY_CLEANUP_HOURS',
            24,
          );

          this.retryService.cleanupOldContexts(cleanupHours);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erro desconhecido';
          this.logger.error('Erro no processamento de retry', {
            error: errorMessage,
          });
        }
      })();
    }, intervalMs);

    this.logger.log('Processador de retry iniciado', {
      intervalMs,
    });
  }

  /**
   * Gera ID único para notificação
   * @returns ID único
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Envia múltiplas notificações em lote
   * @param notifications Array de notificações para enviar
   * @returns Array com resultados dos envios
   */
  async sendBulkNotifications(
    notifications: SendNotificationData[],
  ): Promise<NotificationResult[]> {
    this.logger.log('Iniciando envio em lote', {
      count: notifications.length,
    });

    const results = await Promise.allSettled(
      notifications.map((notification) => this.sendNotification(notification)),
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            status: NotificationStatus.FAILED,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : 'Erro desconhecido',
          },
    );
  }

  /**
   * Testa envio de uma notificação (modo preview)
   * @param templateName Nome do template
   * @param sampleData Dados de exemplo
   * @returns Conteúdo renderizado
   */
  async testNotification(
    templateName: string,
    sampleData?: Record<string, unknown>,
  ): Promise<string> {
    try {
      const template = (await this.templateService.findTemplateByName(
        templateName,
      )) as TemplateData;

      return await this.rendererService.createTemplatePreview(
        template.content,
        sampleData,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao testar notificação', {
        templateName,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Verifica status de saúde de todos os canais
   * @returns Status de cada canal
   */
  async getChannelsHealthStatus(): Promise<Record<string, unknown>> {
    return this.dispatcherFactory.getChannelsStatus();
  }

  /**
   * Registra log de auditoria da notificação
   * @param template Template usado
   * @param notificationData Dados da notificação
   * @param result Resultado do envio
   */
  private logNotificationAudit(
    template: TemplateData,
    notificationData: SendNotificationData,
    result: NotificationResult,
  ): void {
    try {
      const enableAuditLogs = this.configService.get<boolean>(
        'NOTIFICATION_AUDIT_ENABLED',
        true,
      );

      if (!enableAuditLogs) {
        return;
      }

      // TODO: Integrar com AuditLog quando disponível
      this.logger.debug('Auditoria da notificação', {
        templateId: template.id,
        templateName: template.name,
        channel: template.channel,
        category: template.category,
        recipient: notificationData.recipient,
        status: result.status,
        externalId: result.externalId,
        sentAt: result.sentAt,
        error: result.error,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn('Erro ao registrar auditoria', {
        error: errorMessage,
      });
    }
  }
}
