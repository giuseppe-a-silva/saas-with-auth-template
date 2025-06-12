// ARQUIVO DESCONTINUADO - SUBSTITUÍDO POR EventNotificationService
// TODO: Remover após migração completa para nova arquitetura

/*
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DispatcherFactory,
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
  TemplateData,
} from '../interfaces/notification-dispatcher.interface';
import { SendNotificationData } from '../types/notification.types';
// NotificationTemplateService removido na nova arquitetura event-driven
import { RetryContext, RetryService } from './retry.service';
import { TemplateRendererService } from './template-renderer.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    // templateService removido na nova arquitetura
    private readonly rendererService: TemplateRendererService,
    private readonly dispatcherFactory: DispatcherFactory,
    private readonly retryService: RetryService,
    private readonly configService: ConfigService,
  ) {}

  async sendNotification(
    notificationData: SendNotificationData,
  ): Promise<NotificationResult> {
    throw new Error(
      'NotificationService descontinuado - use EventNotificationService',
    );
  }

  async sendBulkNotifications(
    notifications: SendNotificationData[],
  ): Promise<NotificationResult[]> {
    throw new Error(
      'NotificationService descontinuado - use EventNotificationService',
    );
  }

  async sendNotificationWithRetry(
    notificationData: SendNotificationData,
    maxRetries: number = 3,
  ): Promise<NotificationResult> {
    throw new Error(
      'NotificationService descontinuado - use EventNotificationService',
    );
  }

  async getNotificationHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    channels: Record<NotificationChannel, boolean>;
    lastCheck: Date;
  }> {
    throw new Error(
      'NotificationService descontinuado - use EventNotificationService',
    );
  }
}
*/

// Classe vazia para manter compatibilidade temporária
export class NotificationService {
  constructor() {
    throw new Error(
      'NotificationService descontinuado - use EventNotificationService',
    );
  }
}
