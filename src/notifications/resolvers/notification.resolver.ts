import { Logger } from '@nestjs/common';
import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { NotificationService } from '../services/notification.service';

/**
 * Tipo de retorno para resultado de notificação
 */
@ObjectType()
export class NotificationResult {
  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  externalId?: string;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => String, { nullable: true })
  metadata?: string;

  @Field(() => Date, { nullable: true })
  sentAt?: Date;
}

/**
 * Tipo de retorno para estatísticas de retry
 */
@ObjectType()
export class RetryStatistics {
  @Field(() => Number)
  pending: number;

  @Field(() => Number)
  retrying: number;

  @Field(() => Number)
  success: number;

  @Field(() => Number)
  failed: number;

  @Field(() => Number)
  total: number;
}

/**
 * Tipo de retorno para status de saúde dos canais
 */
@ObjectType()
export class ChannelHealthStatus {
  @Field(() => String)
  channel: string;

  @Field(() => String)
  provider: string;

  @Field(() => Boolean)
  isHealthy: boolean;

  @Field(() => Boolean)
  isConfigured: boolean;

  @Field(() => Number, { nullable: true })
  timeout?: number;
}

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
  @Mutation(() => NotificationResult)
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
  @Query(() => RetryStatistics)
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
  @Query(() => [ChannelHealthStatus])
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
