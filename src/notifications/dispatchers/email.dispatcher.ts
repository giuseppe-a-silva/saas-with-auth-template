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
 * Dispatcher para envio de emails via Nodemailer
 * Suporta SMTP e configurações flexíveis
 */
@Injectable()
export class EmailDispatcher implements NotificationDispatcher {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(EmailDispatcher.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    // Inicializa o transporter apenas se as configurações estiverem disponíveis
    this.initializeTransporter().catch((_error) => {
      // Log do erro já é feito dentro do método
      // Não precisa fazer nada aqui, apenas evita que o erro não tratado apareça
    });
  }

  /**
   * Inicializa o transporter do Nodemailer
   */
  private async initializeTransporter(): Promise<void> {
    try {
      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASS');

      // Só tenta inicializar se as configurações essenciais estiverem presentes
      if (!smtpHost || !smtpUser || !smtpPass) {
        this.logger.warn(
          'Email dispatcher não configurado - variáveis SMTP ausentes',
          {
            hasHost: !!smtpHost,
            hasUser: !!smtpUser,
            hasPass: !!smtpPass,
          },
        );
        this.transporter = null;
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

      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verifica conexão apenas se o transporter foi criado
      if (this.transporter) {
        await this.transporter.verify();
        this.logger.log('Email dispatcher inicializado com sucesso');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn('Email dispatcher não pôde ser inicializado', {
        error: errorMessage,
      });
      this.transporter = null;
    }
  }

  /**
   * Envia email através do Nodemailer
   * @param templateContent Conteúdo renderizado do template
   * @param payload Dados da notificação
   * @returns Resultado do envio
   */
  async send(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    try {
      if (!this.transporter) {
        throw new Error('Email dispatcher não está configurado');
      }

      const emailConfig = this.parseEmailContent(templateContent);
      const defaultFrom = this.configService.get<string>(
        'NOTIFICATION_DEFAULT_FROM',
        'noreply@edumatch.com',
      );

      const mailOptions = {
        from: emailConfig.from || defaultFrom,
        to: payload.recipient.email,
        subject: emailConfig.subject || 'Notificação',
        html: emailConfig.html,
        text: emailConfig.text,
        replyTo: emailConfig.replyTo,
      };

      this.logger.debug('Enviando email', {
        to: payload.recipient.email,
        subject: mailOptions.subject,
        event: payload.event,
      });

      const result: unknown = await this.transporter.sendMail(mailOptions);
      const resultMessageId =
        result && typeof result === 'object' && 'messageId' in result
          ? (result as { messageId: string }).messageId
          : undefined;

      this.logger.log('Email enviado com sucesso', {
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
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao enviar email', {
        error: errorMessage,
        recipient: payload.recipient.email,
        event: payload.event,
      });

      return {
        status: NotificationStatus.FAILED,
        error: errorMessage,
        metadata: {
          provider: 'nodemailer',
        },
      };
    }
  }

  /**
   * Verifica se o dispatcher está operacional
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
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
      provider: 'nodemailer',
      timeout: DEFAULT_TIMEOUTS.email,
      isConfigured: this.transporter !== null,
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
    // Conteúdo HTML aqui

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

    // Se contém tags HTML, trata como HTML, senão como texto
    if (bodyContent.includes('<') && bodyContent.includes('>')) {
      config.html = bodyContent;
    } else {
      config.text = bodyContent;
    }

    return config;
  }
}
