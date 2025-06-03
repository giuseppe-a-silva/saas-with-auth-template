import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { PasswordService } from './password.service';

/**
 * Serviço responsável pela recuperação e redefinição de senhas
 * Gerencia tokens de recuperação e envio de emails
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Gera um token de recuperação seguro
   * @returns Token único de 64 caracteres
   * @private
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calcula data de expiração do token (24 horas)
   * @returns Data de expiração
   * @private
   */
  private getTokenExpirationDate(): Date {
    const expirationHours = this.configService.get<number>(
      'PASSWORD_RESET_EXPIRATION_HOURS',
      24,
    );
    return new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }

  /**
   * Inicia processo de recuperação de senha
   * @param email - Email do usuário
   * @returns true se email foi enviado ou false se usuário não foi encontrado
   */
  async forgotPassword(email: string): Promise<boolean> {
    try {
      // Busca usuário pelo email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      // Por segurança, não revela se o usuário existe ou não
      if (!user) {
        this.logger.warn(
          `Tentativa de recuperação para email inexistente: ${email}`,
        );
        return true; // Retorna true por segurança
      }

      // Gera token de recuperação
      const resetToken = this.generateResetToken();
      const expiresAt = this.getTokenExpirationDate();

      // Atualiza usuário com token de recuperação
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetTokenExpires: expiresAt,
        },
      });

      // Constrói URL de recuperação
      const baseUrl = this.configService.get<string>(
        'APP_BASE_URL',
        'http://localhost:3000',
      );
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

      // Dados para o template
      const templateData = {
        userName: user.username,
        resetUrl,
        expirationTime: '24 horas',
        supportUrl: `${baseUrl}/support`,
      };

      // Envia email de recuperação
      await this.notificationService.sendNotification({
        templateName: 'auth-password-reset',
        recipient: {
          id: user.id,
          name: user.username,
          email: user.email,
        },
        data: templateData,
        meta: {
          type: 'password_reset',
          expiresAt: expiresAt.toISOString(),
        },
      });

      this.logger.log(`Email de recuperação enviado para: ${user.email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao processar recuperação de senha para ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Redefine a senha usando token de recuperação
   * @param token - Token de recuperação
   * @param newPassword - Nova senha
   * @returns true se senha foi redefinida com sucesso
   * @throws {BadRequestException} Se token for inválido ou expirado
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // Busca usuário pelo token válido
      const user = await this.prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetTokenExpires: {
            gt: new Date(), // Token ainda não expirou
          },
        },
      });

      if (!user) {
        throw new BadRequestException(
          'Token de recuperação inválido ou expirado.',
        );
      }

      // Hash da nova senha
      const hashedPassword =
        await this.passwordService.hashPassword(newPassword);

      // Atualiza senha e remove token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetTokenExpires: null,
        },
      });

      // Envia notificação de senha alterada
      const now = new Date();
      const templateData = {
        userName: user.username,
        changeDate: now.toLocaleDateString('pt-BR'),
        changeTime: now.toLocaleTimeString('pt-BR'),
        ipAddress: 'Não disponível',
        device: 'Navegador',
        securityUrl: `${this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000')}/auth/security`,
      };

      await this.notificationService.sendNotification({
        templateName: 'auth-password-changed',
        recipient: {
          id: user.id,
          name: user.username,
          email: user.email,
        },
        data: templateData,
        meta: {
          type: 'password_changed_via_reset',
          timestamp: now.toISOString(),
        },
      });

      this.logger.log(
        `Senha redefinida com sucesso para usuário: ${user.email}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erro ao redefinir senha:`, error);
      throw new BadRequestException('Erro interno ao redefinir senha.');
    }
  }

  /**
   * Verifica se um token de recuperação está válido
   * @param token - Token a ser verificado
   * @returns true se token é válido
   */
  async isTokenValid(token: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetTokenExpires: {
            gt: new Date(),
          },
        },
      });

      return !!user;
    } catch (error) {
      this.logger.error(`Erro ao verificar validade do token:`, error);
      return false;
    }
  }
}
