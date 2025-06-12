import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditActionType } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { DispatcherFactory } from '../dispatchers/dispatcher.factory';
import {
  DefaultTemplate,
  EventNotificationPayload,
} from '../interfaces/event-notification.interface';
import {
  NotificationChannel,
  NotificationStatus,
} from '../interfaces/notification-dispatcher.interface';
import { TemplateManagerService } from '../services/template-manager.service';
import { TemplateRendererService } from '../services/template-renderer.service';

/**
 * Interface para dados do job
 */
interface NotificationJobData {
  eventKey: string;
  payload: EventNotificationPayload;
}

/**
 * Processor para jobs de notificação do BullMQ
 * Processa eventos e envia notificações pelos canais configurados
 */
@Injectable()
export class NotificationProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker!: Worker;
  private redisConnection!: IORedis;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly dispatcherFactory: DispatcherFactory,
    private readonly templateRenderer: TemplateRendererService,
    private readonly templateManager: TemplateManagerService,
  ) {}

  /**
   * Inicializa o worker do BullMQ
   */
  onModuleInit(): void {
    try {
      // Configuração Redis
      this.redisConnection = new IORedis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        maxRetriesPerRequest: null,
      });

      // Configuração do worker
      this.worker = new Worker(
        'notifications',
        async (job: Job<NotificationJobData>) => {
          return this.processNotificationJob(job);
        },
        {
          connection: this.redisConnection,
          concurrency: 4, // 4 workers simultâneos conforme solicitado
        },
      );

      this.worker.on('completed', (job: Job<NotificationJobData>) => {
        this.logger.log('Job processado com sucesso', {
          jobId: job.id,
          eventKey: job.data.eventKey,
        });
      });

      this.worker.on(
        'failed',
        (job: Job<NotificationJobData> | undefined, err: Error) => {
          this.logger.error('Job falhou', {
            jobId: job?.id,
            eventKey: job?.data?.eventKey,
            error: err.message,
          });
        },
      );

      this.logger.log('Worker de notificações inicializado com 4 workers');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao inicializar worker', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Processa um job de notificação
   * @param job Job do BullMQ
   * @returns Resultado do processamento
   */
  private async processNotificationJob(job: Job<NotificationJobData>): Promise<{
    eventKey: string;
    totalChannels: number;
    successCount: number;
    failureCount: number;
    channelResults: Array<{
      channel: string;
      success: boolean;
      externalId?: string;
      error?: string;
    }>;
  }> {
    const { eventKey, payload } = job.data;

    this.logger.log('Processando job de notificação', {
      jobId: job.id,
      eventKey,
      recipientEmail: payload.recipient.email,
    });

    try {
      // 1. Buscar templates configurados para este evento
      const templates = await this.findTemplatesForEvent(eventKey);

      // 2. Se não há templates, criar templates padrão para todos os canais
      if (templates.length === 0) {
        this.logger.log(
          'Nenhum template encontrado, criando templates padrão',
          {
            eventKey,
          },
        );
        templates.push(...this.generateDefaultTemplates(eventKey));
      }

      // 3. Processar cada template/canal
      const channelResults = [];
      let successCount = 0;
      let failureCount = 0;

      for (const template of templates) {
        try {
          const result = await this.processChannelNotification(
            template,
            payload,
          );
          channelResults.push(result);

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erro desconhecido';
          channelResults.push({
            channel: template.channel,
            success: false,
            error: errorMessage,
          });
          failureCount++;
        }
      }

      // 4. Registrar auditoria
      await this.logNotificationAudit(eventKey, payload, channelResults);

      this.logger.log('Job processado', {
        jobId: job.id,
        eventKey,
        totalChannels: templates.length,
        successCount,
        failureCount,
      });

      return {
        eventKey,
        totalChannels: templates.length,
        successCount,
        failureCount,
        channelResults,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao processar job', {
        jobId: job.id,
        eventKey,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Busca templates configurados para um evento
   * @param eventKey Chave do evento
   * @returns Lista de templates
   */
  private async findTemplatesForEvent(
    eventKey: string,
  ): Promise<DefaultTemplate[]> {
    const dbTemplates =
      await this.prismaService.eventNotificationTemplate.findMany({
        where: {
          eventKey,
          isActive: true,
        },
      });

    return dbTemplates.map((template) => ({
      eventKey: template.eventKey,
      channel: template.channel as NotificationChannel,
      title: template.title,
      content: template.content,
    }));
  }

  /**
   * Gera templates padrão para todos os canais
   * @param eventKey Chave do evento
   * @returns Templates padrão
   */
  private generateDefaultTemplates(eventKey: string): DefaultTemplate[] {
    const channels = [
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
      NotificationChannel.REALTIME,
    ];

    return channels.map((channel) => ({
      eventKey,
      channel,
      title: `🔔 Evento: ${eventKey}`,
      content: this.getDefaultTemplateContent(channel),
    }));
  }

  /**
   * Obtém conteúdo padrão por canal
   * @param channel Canal da notificação
   * @returns Conteúdo do template
   */
  private getDefaultTemplateContent(channel: NotificationChannel): string {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return `
SUBJECT: 🔔 Evento: {{ eventKey }}
FROM: noreply@edumatch.com
---
<h2>Notificação de Evento</h2>
<p><strong>Evento:</strong> {{ eventKey }}</p>
<p><strong>Data:</strong> {{ timestamp }}</p>
<p><strong>Dados:</strong></p>
<pre>{{ data | json }}</pre>
        `.trim();

      case NotificationChannel.PUSH:
        return `
TITLE: 🔔 {{ eventKey }}
BODY: Evento ocorrido em {{ timestamp }}
DATA: {{ data | json }}
        `.trim();

      case NotificationChannel.REALTIME:
        return `
{
  "event": "{{ eventKey }}",
  "timestamp": "{{ timestamp }}",
  "data": {{ data | json }}
}
        `.trim();

      default:
        return `
Evento: {{ eventKey }}
Timestamp: {{ timestamp }}
Dados: {{ data | json }}
        `.trim();
    }
  }

  /**
   * Processa notificação para um canal específico
   * @param template Template a ser usado
   * @param payload Dados da notificação
   * @returns Resultado do envio
   */
  private async processChannelNotification(
    template: DefaultTemplate,
    payload: EventNotificationPayload,
  ): Promise<{
    channel: string;
    success: boolean;
    externalId?: string;
    error?: string;
  }> {
    try {
      // 1. Renderizar template
      const renderData = {
        eventKey: template.eventKey,
        timestamp: payload.timestamp,
        data: payload.data,
        user: payload.recipient,
        meta: payload.meta ?? {},
      };

      const renderedContent = await this.templateRenderer.renderTemplate(
        template.content,
        renderData,
      );

      // 2. Obter dispatcher
      const dispatcher = this.dispatcherFactory.getDispatcher(
        template.channel as NotificationChannel,
      );

      // 3. Enviar notificação
      const notificationPayload = {
        event: template.eventKey,
        category: 'EVENT',
        timestamp: payload.timestamp,
        recipient: payload.recipient,
        data: payload.data,
        meta: {
          origin: 'event-notification',
          requestId: `${template.eventKey}-${Date.now()}`,
          ...payload.meta,
        },
      };

      const result = await dispatcher.send(
        renderedContent,
        notificationPayload,
      );

      return {
        channel: template.channel,
        success: result.status === NotificationStatus.SENT,
        externalId: result.externalId,
        error: result.error,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        channel: template.channel,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Registra auditoria da notificação
   * @param eventKey Chave do evento
   * @param payload Dados originais
   * @param results Resultados por canal
   */
  private async logNotificationAudit(
    eventKey: string,
    payload: EventNotificationPayload,
    results: Array<{
      channel: string;
      success: boolean;
      externalId?: string;
      error?: string;
    }>,
  ): Promise<void> {
    try {
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      await this.prismaService.auditLog.create({
        data: {
          action:
            successCount > 0
              ? AuditActionType.NOTIFICATION_SENT
              : AuditActionType.NOTIFICATION_FAILED,
          resource: 'EventNotification',
          resourceId: eventKey,
          metadata: {
            eventKey,
            recipientEmail: payload.recipient.email,
            totalChannels: results.length,
            successCount,
            failureCount,
            channelResults: results,
            timestamp: payload.timestamp,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn('Erro ao registrar auditoria', {
        eventKey,
        error: errorMessage,
      });
    }
  }
}
