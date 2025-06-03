import { Logger } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuditActionType } from '@prisma/client';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { ChannelHealthStatus } from '../entities/channel-health-status.entity';
import { NotificationResult } from '../entities/notification-result.entity';
import { RetryStatistics } from '../entities/retry-statistics.entity';
import { NotificationService } from '../services/notification.service';

/**
 * Resolver GraphQL para operações de notificação
 * Expõe mutations e queries para envio e monitoramento
 */
@Resolver()
export class NotificationResolver {
  private readonly logger = new Logger(NotificationResolver.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Envia uma notificação usando um template
   * @param input Dados da notificação
   * @returns Resultado do envio
   */
  @Audit(AuditActionType.NOTIFICATION_SENT, {
    includeRequestBody: true,
    sensitiveFields: ['data', 'meta'],
  })
  @Mutation(() => NotificationResult, {
    description: 'Envia uma notificação usando um template específico',
  })
  async sendNotification(
    @Args('input') input: SendNotificationDto,
  ): Promise<NotificationResult> {
    try {
      this.logger.log('Enviando notificação via GraphQL', {
        templateName: input.templateName,
        recipient: input.recipient.email,
      });

      // Parse dos dados JSON se necessário
      const parsedData = this.parseJsonData(input.data);
      const parsedMeta = input.meta
        ? this.parseJsonData(input.meta)
        : undefined;

      const notificationData = {
        templateName: input.templateName,
        recipient: input.recipient,
        data: parsedData,
        meta: parsedMeta,
      };

      const result =
        await this.notificationService.sendNotification(notificationData);

      this.logger.log('Notificação enviada via GraphQL', {
        templateName: input.templateName,
        status: result.status,
        externalId: result.externalId,
      });

      return {
        status: result.status,
        externalId: result.externalId,
        error: result.error,
        metadata: result.metadata ? JSON.stringify(result.metadata) : undefined,
        sentAt: result.sentAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao enviar notificação via GraphQL', {
        templateName: input.templateName,
        error: errorMessage,
      });

      return {
        status: 'FAILED',
        error: errorMessage,
      };
    }
  }

  /**
   * Obtém estatísticas do sistema de retry
   * @returns Estatísticas de retry
   */
  @Query(() => RetryStatistics, {
    description: 'Obtém estatísticas do sistema de retry de notificações',
  })
  getRetryStatistics(): RetryStatistics {
    const stats = this.notificationService.getRetryStatistics();
    return {
      pending: stats.pending,
      retrying: stats.retrying,
      success: stats.success,
      failed: stats.failed,
      total: stats.total,
    };
  }

  /**
   * Verifica status de saúde dos canais de notificação
   * @returns Status de cada canal
   */
  @Query(() => [ChannelHealthStatus], {
    description:
      'Verifica o status de saúde dos canais de notificação configurados',
  })
  async getChannelsHealthStatus(): Promise<ChannelHealthStatus[]> {
    const channelsStatus =
      await this.notificationService.getChannelsHealthStatus();

    return Object.entries(channelsStatus).map(([channel, status]) => {
      const statusObj = status as Record<string, unknown>;
      return {
        channel,
        provider: (statusObj.provider as string) ?? 'unknown',
        isHealthy: (statusObj.isHealthy as boolean) ?? false,
        isConfigured: (statusObj.isConfigured as boolean) ?? false,
        timeout: statusObj.timeout as number,
      };
    });
  }

  /**
   * Parse de dados JSON com fallback seguro
   * @param jsonString String JSON ou objeto
   * @returns Objeto parseado
   */
  private parseJsonData(
    jsonString: string | Record<string, unknown>,
  ): Record<string, unknown> {
    if (typeof jsonString === 'object' && jsonString !== null) {
      return jsonString;
    }

    if (typeof jsonString === 'string') {
      try {
        const parsed: unknown = JSON.parse(jsonString);
        return typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)
          : {};
      } catch (error) {
        this.logger.warn('Erro ao fazer parse de JSON, usando objeto vazio', {
          jsonString: jsonString.substring(0, 100),
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
        return {};
      }
    }

    return {};
  }
}
