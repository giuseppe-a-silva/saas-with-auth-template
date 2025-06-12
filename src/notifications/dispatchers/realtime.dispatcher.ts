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
 * Dispatcher para notificações em tempo real
 * Suporta Pusher e Soketi com configuração via .env
 * Detecta automaticamente qual provider usar baseado na variável REALTIME_PROVIDER
 */
@Injectable()
export class RealtimeDispatcher implements NotificationDispatcher {
  readonly channel = NotificationChannel.REALTIME;
  private readonly logger = new Logger(RealtimeDispatcher.name);
  private pusherClient: Pusher | null = null;
  private activeProvider: 'pusher' | 'soketi' | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  /**
   * Inicializa o cliente baseado na configuração
   */
  private initializeClient(): void {
    try {
      const realtimeProvider = this.configService.get<string>(
        'REALTIME_PROVIDER',
        'pusher',
      );

      if (realtimeProvider === 'soketi') {
        this.initializeSoketi();
      } else {
        this.initializePusher();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao inicializar realtime dispatcher', {
        error: errorMessage,
      });
    }
  }

  /**
   * Inicializa cliente Pusher
   */
  private initializePusher(): void {
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

    this.activeProvider = 'pusher';
    this.logger.log('Pusher client inicializado com sucesso', { cluster });
  }

  /**
   * Inicializa cliente Soketi
   */
  private initializeSoketi(): void {
    const appId = this.configService.get<string>('SOKETI_APP_ID');
    const key = this.configService.get<string>('SOKETI_KEY');
    const secret = this.configService.get<string>('SOKETI_SECRET');
    const host = this.configService.get<string>('SOKETI_HOST', 'localhost');
    const port = this.configService.get<number>('SOKETI_PORT', 6001);
    const useTLS = this.configService.get<boolean>('SOKETI_USE_TLS', false);

    if (!appId || !key || !secret) {
      this.logger.warn('Soketi não configurado - credenciais ausentes');
      return;
    }

    this.pusherClient = new Pusher({
      appId,
      key,
      secret,
      host,
      port: port.toString(),
      useTLS,
      encrypted: useTLS,
    });

    this.activeProvider = 'soketi';
    this.logger.log('Soketi client inicializado com sucesso', {
      host,
      port,
      useTLS,
    });
  }

  /**
   * Envia notificação em tempo real
   */
  async send(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    try {
      if (!this.pusherClient || !this.activeProvider) {
        throw new Error('Realtime dispatcher não está configurado');
      }

      const realtimeConfig = this.parseRealtimeContent(templateContent);

      // Dados da notificação
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
        provider: this.activeProvider,
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
        provider: this.activeProvider,
        channel: realtimeConfig.channelName,
        event: realtimeConfig.eventName,
        recipient: payload.recipient.id,
      });

      return {
        status: NotificationStatus.SENT,
        externalId: `${realtimeConfig.channelName}:${realtimeConfig.eventName}`,
        sentAt: new Date(),
        metadata: {
          provider: this.activeProvider,
          channel: realtimeConfig.channelName,
          event: realtimeConfig.eventName,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error('Erro ao enviar notificação realtime', {
        provider: this.activeProvider,
        error: errorMessage,
        recipient: payload.recipient.id,
        event: payload.event,
      });

      return {
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata: {
          provider: this.activeProvider ?? 'none',
          event: payload.event,
          category: payload.category,
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
        provider: this.activeProvider,
      });

      return true;
    } catch (error) {
      this.logger.warn('Health check falhou', {
        provider: this.activeProvider,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return false;
    }
  }

  /**
   * Retorna configurações públicas do dispatcher
   */
  getConfig(): Record<string, unknown> {
    return {
      channel: this.channel,
      provider: this.activeProvider ?? 'none',
      timeout: DEFAULT_TIMEOUTS.realtime,
      isConfigured: this.pusherClient !== null,
      ...(this.activeProvider === 'pusher' && {
        cluster: this.configService.get<string>('PUSHER_CLUSTER'),
      }),
      ...(this.activeProvider === 'soketi' && {
        host: this.configService.get<string>('SOKETI_HOST'),
        port: this.configService.get<number>('SOKETI_PORT'),
        useTLS: this.configService.get<boolean>('SOKETI_USE_TLS'),
      }),
    };
  }

  /**
   * Extrai configurações de realtime do conteúdo do template
   */
  private parseRealtimeContent(content: string): RealtimeConfig {
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

    // Extrai dados JSON do conteúdo
    const jsonContent = lines.slice(contentStartIndex).join('\n').trim();

    if (jsonContent) {
      try {
        config.data = JSON.parse(jsonContent) as Record<string, unknown>;
      } catch (error) {
        this.logger.warn('Erro ao parsear JSON do template realtime', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          content: jsonContent,
        });
        config.data = { message: jsonContent };
      }
    }

    return config;
  }
}
