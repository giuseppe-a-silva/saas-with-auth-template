import {
  GetSendQuotaCommand,
  SESClient,
  SendEmailCommand,
} from '@aws-sdk/client-ses';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
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
 * Dispatcher para email que suporta SMTP e AWS SES
 * Prioridades: Se ambos configurados -> SES, senão -> SMTP ou SES individualmente
 * Detecta automaticamente qual provider usar baseado na configuração .env
 */
@Injectable()
export class EmailDispatcher implements NotificationDispatcher {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(EmailDispatcher.name);

  // SMTP - Nodemailer
  private smtpTransporter: nodemailer.Transporter | null = null;
  private smtpConfigured = false;

  // AWS SES
  private sesClient: SESClient | null = null;
  private sesConfigured = false;

  // Provider ativo
  private activeProvider: 'ses' | 'smtp' | null = null;

  constructor(private readonly configService: ConfigService) {
    void this.initializeProviders();
  }

  /**
   * Inicializa ambos os providers e determina qual usar
   */
  private async initializeProviders(): Promise<void> {
    await Promise.all([
      this.initializeSmtpProvider(),
      this.initializeSesProvider(),
    ]);

    this.determineActiveProvider();
  }

  /**
   * Inicializa o provider SMTP
   */
  private async initializeSmtpProvider(): Promise<void> {
    try {
      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASS');

      if (!smtpHost || !smtpUser || !smtpPass) {
        this.logger.debug('SMTP não configurado - variáveis ausentes', {
          hasHost: !!smtpHost,
          hasUser: !!smtpUser,
          hasPass: !!smtpPass,
        });
        return;
      }

      const smtpConfig = {
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };

      this.smtpTransporter = nodemailer.createTransport(smtpConfig);
      await this.smtpTransporter.verify();

      this.smtpConfigured = true;
      this.logger.log('SMTP provider inicializado com sucesso');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn('SMTP provider não pôde ser inicializado', {
        error: errorMessage,
      });
      this.smtpTransporter = null;
      this.smtpConfigured = false;
    }
  }

  /**
   * Inicializa o provider SES
   */
  private initializeSesProvider(): void {
    try {
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );
      const region = this.configService.get<string>(
        'AWS_SES_REGION',
        'us-east-1',
      );

      if (!accessKeyId || !secretAccessKey) {
        this.logger.debug('SES não configurado - credenciais AWS ausentes');
        return;
      }

      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.sesConfigured = true;
      this.logger.log('SES provider inicializado com sucesso', { region });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn('SES provider não pôde ser inicializado', {
        error: errorMessage,
      });
      this.sesClient = null;
      this.sesConfigured = false;
    }
  }

  /**
   * Determina qual provider usar baseado nas configurações
   * Prioridade: Se ambos configurados -> SES, senão -> disponível
   */
  private determineActiveProvider(): void {
    if (this.sesConfigured && this.smtpConfigured) {
      this.activeProvider = 'ses';
      this.logger.log(
        'Usando SES como provider principal (ambos configurados)',
      );
    } else if (this.sesConfigured) {
      this.activeProvider = 'ses';
      this.logger.log('Usando SES como provider único');
    } else if (this.smtpConfigured) {
      this.activeProvider = 'smtp';
      this.logger.log('Usando SMTP como provider único');
    } else {
      this.activeProvider = null;
      this.logger.warn('Nenhum provider de email configurado');
    }
  }

  /**
   * Envia email usando o provider ativo
   */
  async send(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    if (!this.activeProvider) {
      const error = 'Nenhum provider de email configurado';
      this.logger.error(error);
      return {
        status: NotificationStatus.FAILED,
        error,
        metadata: { provider: 'none' },
      };
    }

    try {
      if (this.activeProvider === 'ses') {
        return await this.sendViaSes(templateContent, payload);
      } else {
        return await this.sendViaSmtp(templateContent, payload);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error('Erro ao enviar email', {
        provider: this.activeProvider,
        error: errorMessage,
        recipient: payload.recipient.email,
        event: payload.event,
      });

      return {
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata: {
          provider: this.activeProvider,
          event: payload.event,
          category: payload.category,
        },
      };
    }
  }

  /**
   * Envia email via AWS SES
   */
  private async sendViaSes(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    if (!this.sesClient) {
      throw new Error('SES client não inicializado');
    }

    const startTime = Date.now();
    const emailConfig = this.parseEmailContent(templateContent);
    const defaultFrom = this.configService.get<string>(
      'SES_VERIFIED_EMAIL',
      this.configService.get<string>(
        'NOTIFICATION_DEFAULT_FROM',
        'noreply@edumatch.com',
      ),
    );

    const command = new SendEmailCommand({
      Source: emailConfig.from ?? defaultFrom,
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
      ConfigurationSetName: this.configService.get<string>(
        'SES_CONFIGURATION_SET',
      ),
      Tags: [
        {
          Name: 'Environment',
          Value: this.configService.get<string>('NODE_ENV', 'development'),
        },
        {
          Name: 'Service',
          Value: 'EduMatch',
        },
        {
          Name: 'Event',
          Value: payload.event,
        },
        {
          Name: 'Category',
          Value: payload.category,
        },
      ],
    });

    const response = await this.sesClient.send(command);
    const responseTime = Date.now() - startTime;

    this.logger.log('Email enviado via SES com sucesso', {
      messageId: response.MessageId,
      recipient: payload.recipient.email,
      responseTime,
      event: payload.event,
    });

    return {
      status: NotificationStatus.SENT,
      externalId: response.MessageId!,
      metadata: {
        provider: 'aws-ses',
        responseTime,
        region: this.configService.get<string>('AWS_SES_REGION'),
        event: payload.event,
        category: payload.category,
      },
      sentAt: new Date(),
    };
  }

  /**
   * Envia email via SMTP
   */
  private async sendViaSmtp(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    if (!this.smtpTransporter) {
      throw new Error('SMTP transporter não inicializado');
    }

    const emailConfig = this.parseEmailContent(templateContent);
    const defaultFrom = this.configService.get<string>(
      'NOTIFICATION_DEFAULT_FROM',
      'noreply@edumatch.com',
    );

    const mailOptions = {
      from: emailConfig.from ?? defaultFrom,
      to: payload.recipient.email,
      subject: emailConfig.subject || 'Notificação',
      html: emailConfig.html,
      text: emailConfig.text,
      replyTo: emailConfig.replyTo,
    };

    this.logger.debug('Enviando email via SMTP', {
      to: payload.recipient.email,
      subject: mailOptions.subject,
      event: payload.event,
    });

    const result: unknown = await this.smtpTransporter.sendMail(mailOptions);
    const resultMessageId =
      result && typeof result === 'object' && 'messageId' in result
        ? (result as { messageId: string }).messageId
        : undefined;

    this.logger.log('Email enviado via SMTP com sucesso', {
      messageId: resultMessageId,
      to: payload.recipient.email,
      event: payload.event,
    });

    return {
      status: NotificationStatus.SENT,
      externalId: resultMessageId,
      sentAt: new Date(),
      metadata: {
        provider: 'nodemailer',
        response:
          result && typeof result === 'object' && 'response' in result
            ? (result as { response: string }).response
            : undefined,
        event: payload.event,
        category: payload.category,
      },
    };
  }

  /**
   * Verifica se o dispatcher está operacional
   */
  async isHealthy(): Promise<boolean> {
    if (!this.activeProvider) {
      return false;
    }

    try {
      if (this.activeProvider === 'ses') {
        return await this.isSesHealthy();
      } else {
        return await this.isSmtpHealthy();
      }
    } catch (error) {
      this.logger.warn('Health check falhou', {
        provider: this.activeProvider,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return false;
    }
  }

  /**
   * Verifica saúde do SES
   */
  private async isSesHealthy(): Promise<boolean> {
    if (!this.sesClient) {
      return false;
    }

    const command = new GetSendQuotaCommand({});
    const response = await this.sesClient.send(command);

    const quotaUsed = response.SentLast24Hours ?? 0;
    const quotaLimit = response.Max24HourSend ?? 0;
    const isWithinQuota = quotaUsed < quotaLimit * 0.9;

    this.logger.debug('SES health check concluído', {
      quotaUsed,
      quotaLimit,
      isWithinQuota,
    });

    return isWithinQuota;
  }

  /**
   * Verifica saúde do SMTP
   */
  private async isSmtpHealthy(): Promise<boolean> {
    if (!this.smtpTransporter) {
      return false;
    }

    await this.smtpTransporter.verify();
    return true;
  }

  /**
   * Retorna configurações públicas do dispatcher
   */
  getConfig(): Record<string, unknown> {
    return {
      channel: this.channel,
      provider: this.activeProvider ?? 'none',
      timeout: DEFAULT_TIMEOUTS.email,
      isConfigured: this.activeProvider !== null,
      availableProviders: {
        smtp: this.smtpConfigured,
        ses: this.sesConfigured,
      },
      selectedProvider: this.activeProvider,
      ...(this.activeProvider === 'ses' && {
        region: this.configService.get<string>('AWS_SES_REGION', 'us-east-1'),
        verifiedEmail: this.configService.get<string>('SES_VERIFIED_EMAIL'),
      }),
    };
  }

  /**
   * Extrai configurações de email do conteúdo do template
   */
  private parseEmailContent(content: string): EmailConfig {
    const lines = content.split('\n');
    const config: EmailConfig = {
      from: '',
      subject: '',
    };
    let contentStart = 0;

    // Procura por metadados no início do template
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '---') {
        contentStart = i + 1;
        break;
      }

      if (line.startsWith('SUBJECT:')) {
        config.subject = line.substring(8).trim();
      } else if (line.startsWith('FROM:')) {
        config.from = line.substring(5).trim();
      } else if (line.startsWith('REPLY-TO:')) {
        config.replyTo = line.substring(9).trim();
      }
    }

    // Extrai o conteúdo principal
    const htmlContent = lines.slice(contentStart).join('\n').trim();

    if (htmlContent) {
      config.html = htmlContent;
      config.text = this.htmlToText(htmlContent);
    }

    return config;
  }

  /**
   * Converte HTML para texto plano
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
