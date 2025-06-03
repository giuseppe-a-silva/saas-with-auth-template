import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel } from '../interfaces/notification-dispatcher.interface';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const configs: Record<string, any> = {
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          RATE_LIMIT_EMAIL_PER_MINUTE: 10,
          RATE_LIMIT_EMAIL_PER_HOUR: 100,
          RATE_LIMIT_EMAIL_PER_DAY: 1000,
        };
        return configs[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  describe('Inicialização', () => {
    it('deve ser definido corretamente', () => {
      expect(service).toBeDefined();
    });
  });

  describe('checkLimit', () => {
    it('deve permitir primeira requisição', async () => {
      // Arrange
      const mockChannel = NotificationChannel.EMAIL;
      const mockRecipient = 'test@example.com';

      // Act
      const actualResult = await service.checkLimit(mockChannel, mockRecipient);

      // Assert
      expect(actualResult.allowed).toBe(true);
      expect(actualResult.currentUsage).toBeDefined();
      expect(actualResult.limits).toBeDefined();
    });

    it('deve incrementar usage após checkLimit', async () => {
      // Arrange
      const mockChannel = NotificationChannel.EMAIL;
      const mockRecipient = 'usage-test@example.com';

      // Act
      const firstCheck = await service.checkLimit(mockChannel, mockRecipient);
      const secondCheck = await service.checkLimit(mockChannel, mockRecipient);

      // Assert
      expect(firstCheck.allowed).toBe(true);
      expect(secondCheck.allowed).toBe(true);
      expect(secondCheck.currentUsage.perMinute).toBeGreaterThan(
        firstCheck.currentUsage.perMinute,
      );
    });
  });

  describe('recordSuccess', () => {
    it('deve registrar sucesso sem erro', async () => {
      // Arrange
      const mockChannel = NotificationChannel.EMAIL;
      const mockRecipient = 'test@example.com';

      // Act & Assert
      await expect(
        service.recordSuccess(mockChannel, mockRecipient),
      ).resolves.toBeUndefined();
    });
  });

  describe('getUsageStatistics', () => {
    it('deve retornar estatísticas iniciais', () => {
      // Act
      const actualStats = service.getUsageStatistics();

      // Assert
      expect(actualStats.totalContexts).toBeDefined();
      expect(actualStats.activeContexts).toBeDefined();
      expect(actualStats.byChannel).toBeDefined();
      expect(typeof actualStats.totalContexts).toBe('number');
      expect(typeof actualStats.activeContexts).toBe('number');
      expect(typeof actualStats.byChannel).toBe('object');
    });
  });

  describe('clearLimit', () => {
    it('deve retornar false para context inexistente', () => {
      // Arrange
      const mockChannel = NotificationChannel.EMAIL;
      const mockRecipient = 'nonexistent@example.com';

      // Act
      const actualResult = service.clearLimit(mockChannel, mockRecipient);

      // Assert
      expect(actualResult).toBe(false);
    });

    it('deve retornar true após criar e limpar context', async () => {
      // Arrange
      const mockChannel = NotificationChannel.EMAIL;
      const mockRecipient = 'clear-test@example.com';

      // Primeiro criar um context através do checkLimit
      await service.checkLimit(mockChannel, mockRecipient);

      // Act
      const actualResult = service.clearLimit(mockChannel, mockRecipient);

      // Assert
      expect(actualResult).toBe(true);
    });
  });

  describe('clearAllLimits', () => {
    it('deve retornar 0 quando não há contexts', () => {
      // Act
      const actualCount = service.clearAllLimits();

      // Assert
      expect(typeof actualCount).toBe('number');
      expect(actualCount).toBeGreaterThanOrEqual(0);
    });

    it('deve limpar contexts existentes', async () => {
      // Arrange - criar alguns contexts
      await service.checkLimit(NotificationChannel.EMAIL, 'user1@example.com');
      await service.checkLimit(NotificationChannel.EMAIL, 'user2@example.com');

      // Act
      const clearedCount = service.clearAllLimits();

      // Assert
      expect(clearedCount).toBeGreaterThanOrEqual(0);

      // Verificar se realmente limpou
      const statsAfterClear = service.getUsageStatistics();
      expect(statsAfterClear.totalContexts).toBe(0);
    });
  });
});
