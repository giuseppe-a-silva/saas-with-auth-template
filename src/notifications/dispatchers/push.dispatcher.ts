import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OneSignal from 'onesignal-node';
import { DEFAULT_TIMEOUTS } from '../constants/notification.constants';
import {
  NotificationChannel,
  NotificationDispatcher,
  NotificationPayload,
  NotificationResult,
  NotificationStatus,
  PushConfig,
} from '../interfaces/notification-dispatcher.interface';

/**
 * Interface para response do OneSignal
 */
interface OneSignalResponse {
  body: {
    id: string;
    recipients: number;
  };
}

/**
 * Dispatcher para envio de push notifications via OneSignal
 * Suporte para mobile e web push notifications
 */
@Injectable()
export class PushDispatcher implements NotificationDispatcher {
  readonly channel = NotificationChannel.PUSH;
  private readonly logger = new Logger(PushDispatcher.name);
  private oneSignalClient: OneSignal.Client | null = null;
  private readonly appId: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('ONESIGNAL_APP_ID', '');
    this.initializeClient();
  }

  /**
   * Inicializa o cliente OneSignal
   */
  private initializeClient(): void {
    try {
      const apiKey = this.configService.get<string>('ONESIGNAL_API_KEY');

      if (!apiKey || !this.appId) {
        this.logger.warn(
          'OneSignal não configurado - API_KEY ou APP_ID ausentes',
        );
        return;
      }

      this.oneSignalClient = new OneSignal.Client(this.appId, apiKey);
      this.logger.log('Push dispatcher inicializado com sucesso');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao inicializar push dispatcher', {
        error: errorMessage,
      });
    }
  }

  /**
   * Envia push notification através do OneSignal
   * @param templateContent Conteúdo renderizado do template
   * @param payload Dados da notificação
   * @returns Resultado do envio
   */
  async send(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    try {
      if (!this.oneSignalClient) {
        throw new Error('Push dispatcher não está configurado');
      }

      const pushConfig = this.parsePushContent(templateContent);

      // Dados da notificação para OneSignal
      const notificationData = {
        contents: { en: pushConfig.body },
        headings: { en: pushConfig.title },
        include_external_user_ids: [payload.recipient.id],
        data: {
          ...pushConfig.data,
          event: payload.event,
          category: payload.category,
          recipient: payload.recipient,
        },
        ...(pushConfig.icon && { chrome_web_icon: pushConfig.icon }),
        ...(pushConfig.badge && { chrome_web_badge: pushConfig.badge }),
        ...(pushConfig.sound && {
          ios_sound: pushConfig.sound,
          android_sound: pushConfig.sound,
        }),
      };

      this.logger.debug('Enviando push notification', {
        recipient: payload.recipient.id,
        title: pushConfig.title,
        event: payload.event,
      });

      const response = (await this.oneSignalClient.createNotification(
        notificationData,
      )) as OneSignalResponse;

      this.logger.log('Push notification enviada com sucesso', {
        id: response.body.id,
        recipients: response.body.recipients,
        event: payload.event,
      });

      return {
        status: NotificationStatus.SENT,
        externalId: response.body.id,
        sentAt: new Date(),
        metadata: {
          provider: 'onesignal',
          recipients: response.body.recipients,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao enviar push notification', {
        error: errorMessage,
        recipient: payload.recipient.id,
        event: payload.event,
      });

      return {
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata: {
          provider: 'onesignal',
        },
      };
    }
  }

  /**
   * Verifica se o dispatcher está configurado e funcionando
   * @returns true se estiver operacional
   */
  isHealthy(): Promise<boolean> {
    try {
      // Verifica se o cliente está configurado
      if (!this.oneSignalClient) {
        return Promise.resolve(false);
      }

      // Verifica configurações básicas
      const hasAppId = !!this.configService.get<string>('ONESIGNAL_APP_ID');
      const hasApiKey = !!this.configService.get<string>('ONESIGNAL_API_KEY');

      return Promise.resolve(hasAppId && hasApiKey);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao verificar saúde do dispatcher push', {
        error: errorMessage,
      });
      return Promise.resolve(false);
    }
  }

  /**
   * Retorna configurações públicas do dispatcher
   */
  getConfig(): Record<string, unknown> {
    return {
      channel: this.channel,
      provider: 'onesignal',
      timeout: DEFAULT_TIMEOUTS.push,
      isConfigured: this.oneSignalClient !== null,
      appId: this.appId ? '***' : null, // Mascarado por segurança
    };
  }

  /**
   * Extrai configurações de push do conteúdo do template
   * @param content Conteúdo renderizado
   * @returns Configurações de push
   */
  private parsePushContent(content: string): PushConfig {
    // Formato esperado:
    // TITLE: Título do push
    // ICON: https://exemplo.com/icon.png
    // BADGE: https://exemplo.com/badge.png
    // SOUND: default
    // ---
    // Corpo da mensagem aqui

    const lines = content.split('\n');
    const config: PushConfig = {
      title: 'Notificação',
      body: '',
    };

    let contentStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '---') {
        contentStartIndex = i + 1;
        break;
      }

      if (line.startsWith('TITLE:')) {
        config.title = line.replace('TITLE:', '').trim();
      } else if (line.startsWith('ICON:')) {
        config.icon = line.replace('ICON:', '').trim();
      } else if (line.startsWith('BADGE:')) {
        config.badge = line.replace('BADGE:', '').trim();
      } else if (line.startsWith('SOUND:')) {
        config.sound = line.replace('SOUND:', '').trim();
      }
    }

    // Resto do conteúdo é o corpo da mensagem
    config.body =
      lines.slice(contentStartIndex).join('\n').trim() ||
      'Você tem uma nova notificação';

    return config;
  }
}
