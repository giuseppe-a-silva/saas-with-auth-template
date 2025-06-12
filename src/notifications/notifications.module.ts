import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/prisma.module';
import { DispatcherFactory } from './dispatchers/dispatcher.factory';
import { EmailDispatcher } from './dispatchers/email.dispatcher';
import { PushDispatcher } from './dispatchers/push.dispatcher';
import { RealtimeDispatcher } from './dispatchers/realtime.dispatcher';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationTemplateResolver } from './resolvers/notification-template.resolver';
import { TemplateValidationResolver } from './resolvers/template-validation.resolver';
import { EventNotificationService } from './services/event-notification.service';
import { NotificationMetricsService } from './services/notification-metrics.service';

import { RateLimiterService } from './services/rate-limiter.service';
import { RetryService } from './services/retry.service';
import { TemplateManagerService } from './services/template-manager.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { TemplateValidationService } from './services/template-validation.service';

/**
 * Módulo de notificações refatorado para arquitetura event-driven
 * Utiliza BullMQ para processamento assíncrono e Redis para cache
 */
@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [
    // Serviços principais
    RetryService,
    EventNotificationService,
    NotificationMetricsService,
    RateLimiterService,
    TemplateRendererService,
    TemplateManagerService,
    TemplateValidationService,
    // Dispatchers
    DispatcherFactory,
    EmailDispatcher,
    PushDispatcher,
    RealtimeDispatcher,

    // Processador BullMQ
    NotificationProcessor,

    // Resolvers GraphQL
    NotificationTemplateResolver,
    TemplateValidationResolver,
  ],
  exports: [
    EventNotificationService,
    NotificationMetricsService,
    RateLimiterService,
    TemplateRendererService,
    TemplateManagerService,
    TemplateValidationService,
  ],
})
export class NotificationsModule {}
