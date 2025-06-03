import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import {
  DEFAULT_HTTP_HEADERS,
  DEFAULT_TIMEOUTS,
} from '../constants/notification.constants';
import {
  NotificationChannel,
  NotificationDispatcher,
  NotificationPayload,
  NotificationResult,
  NotificationStatus,
  WebhookConfig,
} from '../interfaces/notification-dispatcher.interface';

/**
 * Dispatcher para envio de webhooks HTTP para sistemas terceiros
 * Permite integração com CRMs, ERPs e outras ferramentas
 */
@Injectable()
export class WebhookDispatcher implements NotificationDispatcher {
  readonly channel = NotificationChannel.THIRD_PARTY;
  private readonly logger = new Logger(WebhookDispatcher.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Envia webhook HTTP para endpoint configurado
   * @param templateContent Conteúdo renderizado do template
   * @param payload Dados da notificação
   * @returns Resultado do envio
   */
  async send(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    try {
      const webhookConfig = this.parseWebhookContent(templateContent);

      if (!webhookConfig.url) {
        throw new Error('URL do webhook não configurada');
      }

      // Payload padrão para webhook
      const webhookPayload = {
        event: payload.event,
        category: payload.category,
        timestamp: payload.timestamp,
        recipient: payload.recipient,
        data: payload.data,
        meta: payload.meta,
      };

      this.logger.debug('Enviando webhook', {
        url: webhookConfig.url,
        method: webhookConfig.method,
        event: payload.event,
      });

      const response: AxiosResponse = await axios({
        method: webhookConfig.method.toLowerCase(),
        url: webhookConfig.url,
        data: webhookPayload,
        headers: {
          ...DEFAULT_HTTP_HEADERS,
          ...webhookConfig.headers,
        },
        timeout: webhookConfig.timeout ?? DEFAULT_TIMEOUTS.thirdParty,
      });

      this.logger.log('Webhook enviado com sucesso', {
        url: webhookConfig.url,
        status: response.status,
        event: payload.event,
      });

      return {
        status: NotificationStatus.SENT,
        externalId: `${webhookConfig.url}-${Date.now()}`,
        sentAt: new Date(),
        metadata: {
          provider: 'webhook',
          url: webhookConfig.url,
          method: webhookConfig.method,
          statusCode: response.status,
          responseHeaders: response.headers,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao enviar webhook', {
        error: errorMessage,
        event: payload.event,
      });

      return {
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata: {
          provider: 'webhook',
        },
      };
    }
  }

  /**
   * Verifica se o dispatcher está operacional
   */
  isHealthy(): Promise<boolean> {
    // Para webhooks, sempre consideramos "saudável"
    // pois não temos um endpoint fixo para testar
    return Promise.resolve(true);
  }

  /**
   * Retorna configurações públicas do dispatcher
   */
  getConfig(): Record<string, unknown> {
    return {
      channel: this.channel,
      provider: 'webhook',
      timeout: DEFAULT_TIMEOUTS.thirdParty,
      isConfigured: true,
    };
  }

  /**
   * Extrai configurações de webhook do conteúdo do template
   * @param content Conteúdo renderizado
   * @returns Configurações de webhook
   */
  private parseWebhookContent(content: string): WebhookConfig {
    // Formato esperado:
    // URL: https://api.exemplo.com/webhook
    // METHOD: POST
    // TIMEOUT: 15000
    // HEADERS:
    //   Authorization: Bearer token
    //   X-API-Key: key123
    // ---
    // Corpo personalizado (opcional)

    const lines = content.split('\n');
    const config: WebhookConfig = {
      url: '',
      method: 'POST',
      headers: {},
    };

    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      if (line === '---') {
        break;
      }

      if (line.startsWith('URL:')) {
        config.url = line.replace('URL:', '').trim();
      } else if (line.startsWith('METHOD:')) {
        const method = line.replace('METHOD:', '').trim().toUpperCase();
        config.method = method === 'POST' || method === 'PUT' ? method : 'POST';
      } else if (line.startsWith('TIMEOUT:')) {
        const timeout = parseInt(line.replace('TIMEOUT:', '').trim(), 10);
        if (!isNaN(timeout)) {
          config.timeout = timeout;
        }
      } else if (line.startsWith('HEADERS:')) {
        // Próximas linhas são headers até encontrar uma linha que não inicia com espaço
        i++;
        while (i < lines.length && lines[i].startsWith('  ')) {
          const headerLine = lines[i].trim();
          const [key, value] = headerLine.split(':').map((s) => s.trim());
          if (key && value) {
            config.headers![key] = value;
          }
          i++;
        }
        continue; // Pula o i++ no final do loop
      }

      i++;
    }

    return config;
  }
}
