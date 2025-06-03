import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Pusher from 'pusher';
import { DEFAULT_TIMEOUTS } from '../constants/notification.constants';
import {
  NotificationChannel,
  NotificationDispatcher,
  NotificationPayload,
  NotificationResult,
  NotificationStatus,
  RealtimeConfig,
} from '../interfaces/notification-dispatcher.interface';

/**
 * Dispatcher para notificações em tempo real via Pusher/Soketi
 * Ideal para dashboards e aplicações que precisam de updates instantâneos
 */
@Injectable()
export class RealtimeDispatcher implements NotificationDispatcher {
  readonly channel = NotificationChannel.REALTIME;
  private readonly logger = new Logger(RealtimeDispatcher.name);
  private pusherClient: Pusher | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  /**
   * Inicializa o cliente Pusher
   */
  private initializeClient(): void {
    try {
      const appId = this.configService.get<string>('PUSHER_APP_ID');
      const key = this.configService.get<string>('PUSHER_KEY');
      const secret = this.configService.get<string>('PUSHER_SECRET');
      const cluster = this.configService.get<string>('PUSHER_CLUSTER', 'mt1');

      if (!appId || !key || !secret) {
        this.logger.warn('Pusher não configurado - credenciais ausentes');
        return;
      }

      this.pusherClient = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });

      this.logger.log('Realtime dispatcher inicializado com sucesso');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao inicializar realtime dispatcher', {
        error: errorMessage,
      });
    }
  }

  /**
   * Envia notificação em tempo real através do Pusher
   * @param templateContent Conteúdo renderizado do template
   * @param payload Dados da notificação
   * @returns Resultado do envio
   */
  async send(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    try {
      if (!this.pusherClient) {
        throw new Error('Realtime dispatcher não está configurado');
      }

      const realtimeConfig = this.parseRealtimeContent(templateContent);

      // Dados da notificação para Pusher
      const eventData = {
        ...realtimeConfig.data,
        payload: {
          event: payload.event,
          category: payload.category,
          timestamp: payload.timestamp,
          recipient: payload.recipient,
          data: payload.data,
          meta: payload.meta,
        },
      };

      this.logger.debug('Enviando notificação realtime', {
        channel: realtimeConfig.channelName,
        event: realtimeConfig.eventName,
        recipient: payload.recipient.id,
      });

      await this.pusherClient.trigger(
        realtimeConfig.channelName,
        realtimeConfig.eventName,
        eventData,
      );

      this.logger.log('Notificação realtime enviada com sucesso', {
        channel: realtimeConfig.channelName,
        event: realtimeConfig.eventName,
        recipient: payload.recipient.id,
      });

      return {
        status: NotificationStatus.SENT,
        externalId: `${realtimeConfig.channelName}:${realtimeConfig.eventName}`,
        sentAt: new Date(),
        metadata: {
          provider: 'pusher',
          channel: realtimeConfig.channelName,
          event: realtimeConfig.eventName,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao enviar notificação realtime', {
        error: errorMessage,
        recipient: payload.recipient.id,
        event: payload.event,
      });

      return {
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata: {
          provider: 'pusher',
        },
      };
    }
  }

  /**
   * Verifica se o dispatcher está operacional
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.pusherClient) {
        return false;
      }

      // Tenta fazer um trigger simples para verificar conectividade
      await this.pusherClient.trigger('health-check', 'ping', {
        timestamp: Date.now(),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retorna configurações públicas do dispatcher
   */
  getConfig(): Record<string, unknown> {
    return {
      channel: this.channel,
      provider: 'pusher',
      timeout: DEFAULT_TIMEOUTS.realtime,
      isConfigured: this.pusherClient !== null,
    };
  }

  /**
   * Extrai configurações de realtime do conteúdo do template
   * @param content Conteúdo renderizado
   * @returns Configurações de realtime
   */
  private parseRealtimeContent(content: string): RealtimeConfig {
    // Formato esperado:
    // CHANNEL: nome-do-canal
    // EVENT: nome-do-evento
    // ---
    // {"mensagem": "Dados em JSON", "tipo": "alerta"}

    const lines = content.split('\n');
    const config: RealtimeConfig = {
      channelName: 'default',
      eventName: 'notification',
      data: {},
    };

    let contentStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '---') {
        contentStartIndex = i + 1;
        break;
      }

      if (line.startsWith('CHANNEL:')) {
        config.channelName = line.replace('CHANNEL:', '').trim();
      } else if (line.startsWith('EVENT:')) {
        config.eventName = line.replace('EVENT:', '').trim();
      }
    }

    // Resto do conteúdo é JSON com dados extras
    const jsonContent = lines.slice(contentStartIndex).join('\n').trim();

    if (jsonContent) {
      try {
        const parsed: unknown = JSON.parse(jsonContent);
        config.data =
          typeof parsed === 'object' && parsed !== null
            ? (parsed as Record<string, unknown>)
            : {};
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.warn('Erro ao parse do JSON em template realtime', {
          error: errorMessage,
          content: jsonContent,
        });
        config.data = { message: jsonContent };
      }
    }

    return config;
  }
}
