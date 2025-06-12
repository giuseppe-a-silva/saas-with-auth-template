import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationChannel,
  NotificationPayload,
  NotificationStatus,
} from '../../interfaces/notification-dispatcher.interface';
import { EmailDispatcher } from '../email.dispatcher';

describe('EmailDispatcher', () => {
  let dispatcher: EmailDispatcher;
  let _configService: ConfigService;

  const mockNotificationPayload: NotificationPayload = {
    event: 'test-event',
    category: 'test',
    timestamp: new Date().toISOString(),
    recipient: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    },
    data: { message: 'Test message' },
    meta: {
      origin: 'test',
      requestId: 'test-request-id',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailDispatcher,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    dispatcher = module.get<EmailDispatcher>(EmailDispatcher);
    _configService = module.get<ConfigService>(ConfigService);
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(dispatcher).toBeDefined();
      expect(dispatcher.channel).toBe(NotificationChannel.EMAIL);
    });

    it('should return configuration', () => {
      const config = dispatcher.getConfig();

      expect(config).toHaveProperty('channel');
      expect(config).toHaveProperty('provider');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('isConfigured');
      expect(config.channel).toBe(NotificationChannel.EMAIL);
    });
  });

  describe('Health check', () => {
    it('should return health status', async () => {
      const isHealthy = await dispatcher.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Send email', () => {
    it('should handle sending with no configuration', async () => {
      const result = await dispatcher.send(
        'Test content',
        mockNotificationPayload,
      );

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('metadata');
      expect([NotificationStatus.SENT, NotificationStatus.FAILED]).toContain(
        result.status,
      );
    });
  });
});
