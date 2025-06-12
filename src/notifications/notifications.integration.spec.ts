import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/prisma.module';
import { NotificationsModule } from './notifications.module';
import { EventNotificationService } from './services/event-notification.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { TemplateManagerService } from './services/template-manager.service';

describe('NotificationsModule Integration', () => {
  let module: TestingModule;
  let eventNotificationService: EventNotificationService;
  let templateManagerService: TemplateManagerService;
  let rateLimiterService: RateLimiterService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseModule,
        NotificationsModule,
      ],
    }).compile();

    eventNotificationService = module.get<EventNotificationService>(
      EventNotificationService,
    );
    templateManagerService = module.get<TemplateManagerService>(
      TemplateManagerService,
    );
    rateLimiterService = module.get<RateLimiterService>(RateLimiterService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Service Dependencies', () => {
    it('should have all services properly injected', () => {
      expect(eventNotificationService).toBeDefined();
      expect(templateManagerService).toBeDefined();
      expect(rateLimiterService).toBeDefined();
    });
  });

  describe('Module Integration', () => {
    it('should properly initialize all notification services', () => {
      expect(eventNotificationService).toBeDefined();
      expect(templateManagerService).toBeDefined();
      expect(rateLimiterService).toBeDefined();
    });
  });
});

export {}; // Para evitar erro de módulo vazio
