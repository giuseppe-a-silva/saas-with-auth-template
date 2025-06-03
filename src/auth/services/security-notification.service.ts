import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../../notifications/services/notification.service';

/**
 * Serviço responsável por notificações de segurança
 * Envia alertas sobre atividades suspeitas ou importantes
 */
@Injectable()
export class SecurityNotificationService {
  private readonly logger = new Logger(SecurityNotificationService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envia notificação de login
   * @param userInfo - Informações do usuário
   * @param loginInfo - Informações do login
   */
  async sendLoginNotification(
    userInfo: { id: string; username: string; email: string },
    loginInfo: { ipAddress?: string; device?: string; location?: string },
  ): Promise<void> {
    try {
      const now = new Date();
      const templateData = {
        userName: userInfo.username,
        loginDate: now.toLocaleDateString('pt-BR'),
        loginTime: now.toLocaleTimeString('pt-BR'),
        ipAddress: loginInfo.ipAddress ?? 'Não disponível',
        device: loginInfo.device ?? 'Navegador',
        location: loginInfo.location ?? 'Não disponível',
        securityUrl: `${this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000')}/auth/security`,
      };

      await this.notificationService.sendNotification({
        templateName: 'auth-login-notification',
        recipient: {
          id: userInfo.id,
          name: userInfo.username,
          email: userInfo.email,
        },
        data: templateData,
        meta: {
          type: 'login_notification',
          timestamp: now.toISOString(),
          ipAddress: loginInfo.ipAddress,
        },
      });

      this.logger.log(`Notificação de login enviada para: ${userInfo.email}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de login para ${userInfo.email}:`,
        error,
      );
      // Não falha a operação se notificação falhar
    }
  }

  /**
   * Envia notificação de alteração de dados
   * @param userInfo - Informações do usuário
   * @param changes - Lista de alterações realizadas
   * @param changeInfo - Informações sobre a alteração
   */
  async sendDataChangedNotification(
    userInfo: { id: string; username: string; email: string },
    changes: Array<{ field: string; oldValue: string; newValue: string }>,
    changeInfo: { ipAddress?: string; device?: string },
  ): Promise<void> {
    try {
      const now = new Date();
      const templateData = {
        userName: userInfo.username,
        changeDate: now.toLocaleDateString('pt-BR'),
        changeTime: now.toLocaleTimeString('pt-BR'),
        changes,
        ipAddress: changeInfo.ipAddress ?? 'Não disponível',
        device: changeInfo.device ?? 'Navegador',
        securityUrl: `${this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000')}/auth/security`,
        supportUrl: `${this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000')}/support`,
      };

      await this.notificationService.sendNotification({
        templateName: 'auth-data-changed',
        recipient: {
          id: userInfo.id,
          name: userInfo.username,
          email: userInfo.email,
        },
        data: templateData,
        meta: {
          type: 'data_changed',
          timestamp: now.toISOString(),
          changesCount: changes.length,
        },
      });

      this.logger.log(
        `Notificação de alteração de dados enviada para: ${userInfo.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de alteração de dados para ${userInfo.email}:`,
        error,
      );
      // Não falha a operação se notificação falhar
    }
  }

  /**
   * Envia notificação de senha alterada
   * @param userInfo - Informações do usuário
   * @param changeInfo - Informações sobre a alteração
   */
  async sendPasswordChangedNotification(
    userInfo: { id: string; username: string; email: string },
    changeInfo: { ipAddress?: string; device?: string },
  ): Promise<void> {
    try {
      const now = new Date();
      const templateData = {
        userName: userInfo.username,
        changeDate: now.toLocaleDateString('pt-BR'),
        changeTime: now.toLocaleTimeString('pt-BR'),
        ipAddress: changeInfo.ipAddress ?? 'Não disponível',
        device: changeInfo.device ?? 'Navegador',
        securityUrl: `${this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000')}/auth/security`,
      };

      await this.notificationService.sendNotification({
        templateName: 'auth-password-changed',
        recipient: {
          id: userInfo.id,
          name: userInfo.username,
          email: userInfo.email,
        },
        data: templateData,
        meta: {
          type: 'password_changed',
          timestamp: now.toISOString(),
        },
      });

      this.logger.log(
        `Notificação de senha alterada enviada para: ${userInfo.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de senha alterada para ${userInfo.email}:`,
        error,
      );
      // Não falha a operação se notificação falhar
    }
  }
}
