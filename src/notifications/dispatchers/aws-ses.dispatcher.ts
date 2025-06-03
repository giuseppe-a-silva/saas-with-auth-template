import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_TIMEOUTS } from '../constants/notification.constants';
import {
  EmailConfig,
  NotificationChannel,
  NotificationDispatcher,
  NotificationPayload,
  NotificationResult,
  NotificationStatus,
} from '../interfaces/notification-dispatcher.interface';

/**
 * Dispatcher para envio de emails via AWS SES
 * Alternativa robusta ao SMTP para ambientes de produção
 */
@Injectable()
export class AwsSesDispatcher implements NotificationDispatcher {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(AwsSesDispatcher.name);
  private sesClient: SESClient | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeSesClient();
  }

  /**
   * Inicializa o cliente AWS SES
   */
  private initializeSesClient(): void {
    try {
      const accessKeyId = this.configService.get<string>('AWS_SES_ACCESS_KEY');
      const secretAccessKey =
        this.configService.get<string>('AWS_SES_SECRET_KEY');
      const region = this.configService.get<string>('AWS_SES_REGION');

      if (!accessKeyId || !secretAccessKey || !region) {
        this.logger.warn(
          'AWS SES credentials não configuradas. Dispatcher não será inicializado.',
        );
        return;
      }

      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.logger.log('AWS SES dispatcher inicializado com sucesso');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao inicializar AWS SES dispatcher', {
        error: errorMessage,
      });
    }
  }

  /**
   * Envia email através do AWS SES
   * @param templateContent Conteúdo renderizado do template
   * @param payload Dados da notificação
   * @returns Resultado do envio
   */
  async send(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    try {
      if (!this.sesClient) {
        throw new Error('AWS SES dispatcher não está configurado');
      }

      const emailConfig = this.parseEmailContent(templateContent);
      const defaultFrom = this.configService.get<string>(
        'NOTIFICATION_DEFAULT_FROM',
        'noreply@edumatch.com',
      );

      // Configuração do email para SES
      const emailInput: SendEmailCommandInput = {
        Source: emailConfig.from || defaultFrom,
        Destination: {
          ToAddresses: [payload.recipient.email],
        },
        Message: {
          Subject: {
            Data: emailConfig.subject || 'Notificação',
            Charset: 'UTF-8',
          },
          Body: {
            ...(emailConfig.html && {
              Html: {
                Data: emailConfig.html,
                Charset: 'UTF-8',
              },
            }),
            ...(emailConfig.text && {
              Text: {
                Data: emailConfig.text,
                Charset: 'UTF-8',
              },
            }),
          },
        },
        ...(emailConfig.replyTo && {
          ReplyToAddresses: [emailConfig.replyTo],
        }),
        Tags: [
          {
            Name: 'service',
            Value: 'edumatch-notifications',
          },
          {
            Name: 'event',
            Value: payload.event,
          },
          {
            Name: 'category',
            Value: payload.category,
          },
        ],
      };

      this.logger.debug('Enviando email via AWS SES', {
        to: payload.recipient.email,
        subject: emailConfig.subject,
        event: payload.event,
        hasHtml: !!emailConfig.html,
        hasText: !!emailConfig.text,
      });

      const command = new SendEmailCommand(emailInput);
      const response = await this.sesClient.send(command);

      this.logger.log('Email enviado com sucesso via AWS SES', {
        messageId: response.MessageId,
        to: payload.recipient.email,
        event: payload.event,
      });

      return {
        status: NotificationStatus.SENT,
        externalId: response.MessageId,
        sentAt: new Date(),
        metadata: {
          provider: 'aws-ses',
          region: this.configService.get<string>('AWS_SES_REGION'),
          messageId: response.MessageId,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode =
        error && typeof error === 'object' && 'Code' in error
          ? (error as { Code: string }).Code
          : undefined;
      const errorType =
        error && typeof error === 'object' && 'name' in error
          ? (error as { name: string }).name
          : undefined;

      this.logger.error('Erro ao enviar email via AWS SES', {
        error: errorMessage,
        recipient: payload.recipient.email,
        event: payload.event,
        errorCode,
        errorType,
      });

      return {
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata: {
          provider: 'aws-ses',
          errorCode,
          errorType,
        },
      };
    }
  }

  /**
   * Verifica se o dispatcher está operacional
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.sesClient) {
        return false;
      }

      // Verifica quota de envio para testar conectividade
      const { GetSendQuotaCommand } = await import('@aws-sdk/client-ses');
      const command = new GetSendQuotaCommand({});
      await this.sesClient.send(command);

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.debug('AWS SES health check falhou', {
        error: errorMessage,
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
      provider: 'aws-ses',
      timeout: DEFAULT_TIMEOUTS.email,
      isConfigured: this.sesClient !== null,
      region: this.configService.get<string>(
        'AWS_SES_REGION',
        'not-configured',
      ),
    };
  }

  /**
   * Extrai configurações de email do conteúdo do template
   * @param content Conteúdo renderizado
   * @returns Configurações de email
   */
  private parseEmailContent(content: string): EmailConfig {
    // Formato esperado:
    // SUBJECT: Assunto do email
    // FROM: remetente@exemplo.com
    // REPLY-TO: resposta@exemplo.com
    // ---
    // Conteúdo HTML ou texto aqui

    const lines = content.split('\n');
    const config: EmailConfig = {
      from: '',
      subject: '',
    };

    let contentStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '---') {
        contentStartIndex = i + 1;
        break;
      }

      if (line.startsWith('SUBJECT:')) {
        config.subject = line.replace('SUBJECT:', '').trim();
      } else if (line.startsWith('FROM:')) {
        config.from = line.replace('FROM:', '').trim();
      } else if (line.startsWith('REPLY-TO:')) {
        config.replyTo = line.replace('REPLY-TO:', '').trim();
      }
    }

    // Resto do conteúdo é o body do email
    const bodyContent = lines.slice(contentStartIndex).join('\n').trim();

    // Se contém tags HTML, trata como HTML e também gera versão texto
    if (bodyContent.includes('<') && bodyContent.includes('>')) {
      config.html = bodyContent;
      // Gera versão texto simples removendo tags HTML
      config.text = this.stripHtmlTags(bodyContent);
    } else {
      config.text = bodyContent;
    }

    return config;
  }

  /**
   * Remove tags HTML para gerar versão texto
   * @param html Conteúdo HTML
   * @returns Texto sem tags HTML
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove tags HTML
      .replace(/&nbsp;/g, ' ') // Substitui &nbsp; por espaço
      .replace(/&lt;/g, '<') // Decodifica entidades HTML básicas
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }
}
