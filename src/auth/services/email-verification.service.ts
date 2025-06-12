import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { EventNotificationService } from '../../notifications/services/event-notification.service';

/**
 * Serviço responsável pela verificação de email dos usuários
 * Gerencia tokens de verificação e envio de emails
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventNotificationService: EventNotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Gera um token de verificação seguro
   * @returns Token único de 64 caracteres
   * @private
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calcula data de expiração do token (24 horas)
   * @returns Data de expiração
   * @private
   */
  private getTokenExpirationDate(): Date {
    const expirationHours = this.configService.get<number>(
      'EMAIL_VERIFICATION_EXPIRATION_HOURS',
      24,
    );
    return new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }

  /**
   * Envia email de verificação para o usuário
   * @param userId - ID do usuário
   * @param email - Email do usuário
   * @param username - Nome do usuário
   * @returns true se email foi enviado com sucesso
   */
  async sendVerificationEmail(
    userId: string,
    email: string,
    username: string,
  ): Promise<boolean> {
    try {
      // Gera novo token de verificação
      const verificationToken = this.generateVerificationToken();
      const expiresAt = this.getTokenExpirationDate();

      // Atualiza usuário com novo token
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: verificationToken,
          emailVerificationTokenExpires: expiresAt,
        },
      });

      // Configura dados para o template
      const baseUrl = this.configService.get<string>(
        'APP_BASE_URL',
        'http://localhost:3000',
      );
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
      const supportUrl = `${baseUrl}/support`;
      const templateData = {
        userName: username,
        verificationUrl,
        supportUrl,
      };

      // Envia notificação via sistema de eventos
      await this.eventNotificationService.sendNotification(
        'EMAIL_VERIFICATION',
        {
          timestamp: new Date().toISOString(),
          recipient: {
            id: userId,
            name: username,
            email,
          },
          data: templateData,
          meta: {
            type: 'email_verification',
            expiresAt: expiresAt.toISOString(),
          },
        },
      );

      this.logger.log(`Email de verificação enviado para: ${email}`);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao enviar email de verificação', {
        error: errorMessage,
        email,
        userId,
      });
      return false;
    }
  }

  /**
   * Verifica o token de verificação de email
   * @param token - Token de verificação
   * @returns true se verificação foi bem-sucedida
   * @throws {BadRequestException} Se token for inválido ou expirado
   */
  async verifyEmailToken(token: string): Promise<boolean> {
    try {
      // Busca usuário pelo token
      const user = await this.prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationTokenExpires: {
            gt: new Date(), // Token ainda não expirou
          },
        },
      });

      if (!user) {
        throw new BadRequestException(
          'Token de verificação inválido ou expirado.',
        );
      }

      if (user.emailVerified) {
        throw new BadRequestException('Este email já foi verificado.');
      }

      // Marca email como verificado e remove token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpires: null,
        },
      });

      this.logger.log(
        `Email verificado com sucesso para usuário: ${user.email}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erro ao verificar token de email:`, error);
      throw new BadRequestException('Erro interno ao verificar email.');
    }
  }

  /**
   * Verifica se um token de verificação está válido
   * @param token - Token a ser verificado
   * @returns true se token é válido
   */
  async isTokenValid(token: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationTokenExpires: {
            gt: new Date(),
          },
        },
      });

      return !!user && !user.emailVerified;
    } catch (error) {
      this.logger.error(`Erro ao verificar validade do token:`, error);
      return false;
    }
  }

  /**
   * Reenvia email de verificação para um usuário
   * @param email - Email do usuário
   * @returns true se email foi reenviado com sucesso
   * @throws {BadRequestException} Se usuário não for encontrado ou já verificado
   */
  async resendVerificationEmail(email: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new BadRequestException('Usuário não encontrado.');
      }

      if (user.emailVerified) {
        throw new BadRequestException('Email já foi verificado.');
      }

      const result = await this.sendVerificationEmail(
        user.id,
        user.email,
        user.username,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao reenviar email de verificação', {
        error: errorMessage,
        email,
      });
      throw new BadRequestException(
        'Erro interno ao reenviar email de verificação.',
      );
    }
  }
}
