import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/prisma.module';

// Services
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationService } from './services/notification.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { RetryService } from './services/retry.service';
import { TemplateRendererService } from './services/template-renderer.service';

// Dispatchers
import { DispatcherFactory } from './dispatchers/dispatcher.factory';
import { EmailDispatcher } from './dispatchers/email.dispatcher';
import { PushDispatcher } from './dispatchers/push.dispatcher';
import { RealtimeDispatcher } from './dispatchers/realtime.dispatcher';
import { WebhookDispatcher } from './dispatchers/webhook.dispatcher';

// Resolvers
import { NotificationTemplateResolver } from './resolvers/notification-template.resolver';
import { NotificationResolver } from './resolvers/notification.resolver';

/**
 * Módulo de notificações
 * Centraliza e padroniza o envio de notificações em diferentes canais
 */
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    // Services
    TemplateRendererService,
    NotificationTemplateService,
    NotificationService,
    RateLimiterService,
    RetryService,

    // Dispatchers
    EmailDispatcher,
    PushDispatcher,
    RealtimeDispatcher,
    WebhookDispatcher,
    DispatcherFactory,

    // Resolvers
    NotificationTemplateResolver,
    NotificationResolver,
  ],
  exports: [
    TemplateRendererService,
    NotificationTemplateService,
    NotificationService,
    DispatcherFactory,
  ],
})
export class NotificationsModule {}
