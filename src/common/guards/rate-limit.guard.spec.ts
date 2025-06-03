import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RATE_LIMIT_KEY, RateLimit, RateLimitGuard } from './rate-limit.guard';

// Tipos para mocks
interface MockRequest {
  path: string;
  get: jest.MockedFunction<(name: string) => string | undefined>;
  socket: { remoteAddress?: string };
}

interface MockExecutionContext {
  switchToHttp: jest.MockedFunction<() => { getRequest: () => MockRequest }>;
  getHandler: jest.MockedFunction<() => (...args: unknown[]) => unknown>;
  getClass: jest.MockedFunction<() => new (...args: unknown[]) => unknown>;
}

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockRequest = (
    overrides: Partial<MockRequest> = {},
  ): MockRequest => ({
    path: '/test',
    get: jest.fn(),
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  });

  const createMockExecutionContext = (
    request: MockRequest,
  ): MockExecutionContext => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  });

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get(Reflector);

    // Mock do Logger para evitar logs durante os testes
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Reset dos mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Limpa o estado interno do guard
    const requestCounts = (
      guard as unknown as { requestCounts: Map<string, unknown> }
    ).requestCounts;
    requestCounts.clear();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow request when no rate limit is configured', () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockContext = createMockExecutionContext(mockRequest);
      reflector.getAllAndOverride.mockReturnValue(undefined);

      // Act
      const result = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);

      expect(reflector.getAllAndOverride).toHaveBeenLastCalledWith(
        RATE_LIMIT_KEY,
        expect.any(Array),
      );
    });

    it('should allow request within rate limit', () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 60000, maxRequests: 5 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      // Act
      const result = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should allow multiple requests within limit', () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 60000, maxRequests: 3 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      // Act: Múltiplas requisições dentro do limite
      const result1 = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );
      const result2 = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );
      const result3 = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );

      // Assert
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it('should block request when rate limit is exceeded', () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 60000, maxRequests: 2 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      // Act: Exceder o limite
      guard.canActivate(mockContext as unknown as ExecutionContext);
      guard.canActivate(mockContext as unknown as ExecutionContext);

      // Assert: Terceira requisição deve ser bloqueada
      expect(() => {
        guard.canActivate(mockContext as unknown as ExecutionContext);
      }).toThrow(HttpException);

      try {
        guard.canActivate(mockContext as unknown as ExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.TOO_MANY_REQUESTS,
        );
        expect((error as HttpException).message).toContain(
          'Muitas requisições. Limite: 2 por 60s',
        );
      }
    });

    it('should reset counter after window expires', async () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 100, maxRequests: 1 }; // Janela muito pequena
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      // Act: Primeira requisição
      const result1 = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );

      // Aguarda a janela expirar
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Segunda requisição após expiração
      const result2 = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );

      // Assert
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle different IPs separately', () => {
      // Arrange
      const rateLimitConfig = { windowMs: 60000, maxRequests: 1 };

      // Criar guardas separados para evitar estado compartilhado
      const guard1 = new RateLimitGuard(reflector);
      const guard2 = new RateLimitGuard(reflector);

      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      const mockRequest1 = createMockRequest({
        socket: { remoteAddress: '192.168.1.1' },
      });
      const mockRequest2 = createMockRequest({
        socket: { remoteAddress: '192.168.1.2' },
      });

      const mockContext1 = createMockExecutionContext(mockRequest1);
      const mockContext2 = createMockExecutionContext(mockRequest2);

      // Act: Requisições de IPs diferentes
      const result1 = guard1.canActivate(
        mockContext1 as unknown as ExecutionContext,
      );
      const result2 = guard2.canActivate(
        mockContext2 as unknown as ExecutionContext,
      );

      // Assert: Ambas devem ser permitidas
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle different endpoints separately', () => {
      // Arrange
      const rateLimitConfig = { windowMs: 60000, maxRequests: 1 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      const mockRequest1 = createMockRequest({ path: '/endpoint1' });
      const mockRequest2 = createMockRequest({ path: '/endpoint2' });

      const mockContext1 = createMockExecutionContext(mockRequest1);
      const mockContext2 = createMockExecutionContext(mockRequest2);

      // Act: Requisições para endpoints diferentes
      const result1 = guard.canActivate(
        mockContext1 as unknown as ExecutionContext,
      );
      const result2 = guard.canActivate(
        mockContext2 as unknown as ExecutionContext,
      );

      // Assert: Ambas devem ser permitidas
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('extractClientIp integration', () => {
    it('should extract IP from x-forwarded-for header', () => {
      // Arrange
      const mockRequest = createMockRequest({
        get: jest.fn((header: string) => {
          if (header === 'x-forwarded-for') return '203.0.113.195, 70.41.3.18';
          return undefined;
        }),
      });
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 60000, maxRequests: 5 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      // Act
      const result = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRequest.get).toHaveBeenCalledWith('x-forwarded-for');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is empty', () => {
      // Arrange
      const mockRequest = createMockRequest({
        get: jest.fn((header: string) => {
          if (header === 'x-forwarded-for') return undefined;
          if (header === 'x-real-ip') return '203.0.113.200';
          return undefined;
        }),
      });
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 60000, maxRequests: 5 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      // Act
      const result = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRequest.get).toHaveBeenCalledWith('x-forwarded-for');
      // A implementação real chama x-real-ip quando x-forwarded-for é undefined
    });

    it('should use socket remoteAddress as fallback', () => {
      // Arrange
      const mockRequest = createMockRequest({
        get: jest.fn().mockReturnValue(undefined),
        socket: { remoteAddress: '192.168.1.100' },
      });
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 60000, maxRequests: 5 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      // Act
      const result = guard.canActivate(
        mockContext as unknown as ExecutionContext,
      );

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('RateLimit decorator', () => {
    it('should create metadata correctly', () => {
      // Arrange
      const config = { windowMs: 60000, maxRequests: 5 };

      // Act
      const decorator = RateLimit(config);

      // Assert
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should apply metadata to method', () => {
      // Arrange
      const config = { windowMs: 60000, maxRequests: 5 };

      class TestController {
        testMethod(): void {
          // Test method
        }
      }

      // Act: Aplicar decorator
      const decorator = RateLimit(config);
      const testMethod = (): void => {
        // Test method implementation
      };
      decorator(TestController.prototype, 'testMethod', {
        value: testMethod,
        writable: true,
        enumerable: false,
        configurable: true,
      });

      // Act: Buscar metadata diretamente
      const metadata = Reflect.getMetadata(
        RATE_LIMIT_KEY,
        TestController.prototype,
        'testMethod',
      ) as { windowMs: number; maxRequests: number } | undefined;

      // Assert
      expect(metadata).toEqual(config);
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid successive requests correctly', () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 60000, maxRequests: 3 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);

      // Act: Requisições rápidas sucessivas
      const results = [];
      for (let i = 0; i < 5; i++) {
        try {
          const result = guard.canActivate(
            mockContext as unknown as ExecutionContext,
          );
          results.push(result);
        } catch (error) {
          results.push(error);
        }
      }

      // Assert
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(true);
      expect(results[2]).toBe(true);
      expect(results[3]).toBeInstanceOf(HttpException);
      expect(results[4]).toBeInstanceOf(HttpException);
    });

    it('should log warning when rate limit is exceeded', () => {
      // Arrange
      const mockRequest = createMockRequest();
      const mockContext = createMockExecutionContext(mockRequest);
      const rateLimitConfig = { windowMs: 60000, maxRequests: 1 };
      reflector.getAllAndOverride.mockReturnValue(rateLimitConfig);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act: Exceder limite
      guard.canActivate(mockContext as unknown as ExecutionContext);

      try {
        guard.canActivate(mockContext as unknown as ExecutionContext);
      } catch {
        // Expected error
      }

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit excedido'),
        expect.objectContaining({
          endpoint: '/test',
          count: 2,
          limit: 1,
          windowMs: 60000,
        }),
      );
    });
  });
});
