import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditActionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditConfig } from '../config/audit.config';
import { FeatureFlagsConfig } from '../config/feature-flags.config';
import { CreateAuditLogInput } from '../types/audit.types';
import { AuditService } from './audit.service';

// Mock das dependências
const mockPrismaService = {
  auditLog: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockAuditConfig = {
  retentionPolicyDays: {
    [AuditActionType.LOGIN]: 180,
    [AuditActionType.LOGOUT]: 180,
    [AuditActionType.LOGIN_FAILED]: 90,
    [AuditActionType.PASSWORD_CHANGE]: 365,
    [AuditActionType.DATA_UPDATE]: 365,
    [AuditActionType.ACCESS_DENIED]: 90,
    [AuditActionType.PERMISSION_CHECK]: 90,
    [AuditActionType.TOKEN_REFRESH]: 90,
    [AuditActionType.ACCOUNT_LOCKED]: 365,
  },
  fileLogConfig: {
    enabled: true,
    path: './logs/audit-test.log',
    maxFiles: 30,
    maxSize: '100MB',
    datePattern: 'YYYY-MM-DD',
  },
  analyticsConfig: {
    enabled: false,
    endpoint: undefined,
    apiKey: undefined,
    batchSize: 100,
    flushInterval: 30000,
  },
  performanceConfig: {
    asyncProcessing: true,
    bufferSize: 1000,
    flushInterval: 5000,
    maxRetries: 3,
  },
};

interface MockFeatureFlags {
  enableAuditSystem: boolean;
}

const mockFeatureFlags: MockFeatureFlags = {
  enableAuditSystem: true,
};

const mockConfigService = {
  get: jest.fn(),
};

describe('AuditService', () => {
  let service: AuditService;
  let featureFlags: MockFeatureFlags;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditConfig,
          useValue: mockAuditConfig,
        },
        {
          provide: FeatureFlagsConfig,
          useValue: mockFeatureFlags,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    featureFlags = module.get(FeatureFlagsConfig);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Limpa o timer para evitar interferência entre testes
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAuditLog', () => {
    const mockAuditInput: CreateAuditLogInput = {
      userId: 'user-123',
      action: AuditActionType.LOGIN,
      ipAddress: '192.168.1.1',
      endpoint: '/auth/login',
      method: 'POST',
      statusCode: 200,
    };

    it('deve criar log de auditoria quando sistema estiver habilitado', async () => {
      featureFlags.enableAuditSystem = true;
      mockPrismaService.auditLog.create.mockResolvedValue({ id: '1' });

      await service.createAuditLog(mockAuditInput);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          action: AuditActionType.LOGIN,
          ipAddress: '192.168.1.1',
          endpoint: '/auth/login',
          method: 'POST',
          statusCode: 200,
        }) as CreateAuditLogInput,
      });
    });

    it('não deve criar log quando sistema estiver desabilitado', async () => {
      featureFlags.enableAuditSystem = false;

      await service.createAuditLog(mockAuditInput);

      expect(mockPrismaService.auditLog.create).not.toHaveBeenCalled();
    });

    it('não deve propagar erro se criação do log falhar', async () => {
      featureFlags.enableAuditSystem = true;
      mockPrismaService.auditLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      // Não deve lançar exceção
      await expect(
        service.createAuditLog(mockAuditInput),
      ).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredLogs', () => {
    it('deve retornar resultado de cleanup mesmo sem logs expirados', async () => {
      // Mock para findMany retornar array vazio (sem logs expirados)
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.cleanupExpiredLogs();

      expect(result.deletedCount).toBe(0);
      expect(result.errors.length).toBe(0);
      expect(typeof result.duration).toBe('number');
      expect(result.totalProcessed).toBe(0);
    });

    it('deve capturar e retornar erros durante cleanup', async () => {
      const error = new Error('Cleanup failed');
      mockPrismaService.auditLog.findMany.mockRejectedValue(error);

      const result = await service.cleanupExpiredLogs();

      expect(result.deletedCount).toBe(0);
      expect(result.errors).toContain('Cleanup failed');
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('getAuditStats', () => {
    it('deve retornar estatísticas dos logs', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(100);
      mockPrismaService.auditLog.groupBy.mockResolvedValue([
        { action: AuditActionType.LOGIN, _count: { action: 50 } },
        { action: AuditActionType.LOGOUT, _count: { action: 30 } },
      ]);
      mockPrismaService.auditLog.findFirst
        .mockResolvedValueOnce({ createdAt: new Date('2025-01-01') })
        .mockResolvedValueOnce({ createdAt: new Date('2025-01-11') });

      const stats = await service.getAuditStats();

      expect(stats.totalLogs).toBe(100);
      expect(stats.logsByAction).toHaveProperty(AuditActionType.LOGIN, 50);
      expect(stats.logsByAction).toHaveProperty(AuditActionType.LOGOUT, 30);
      expect(stats.oldestLog).toEqual(new Date('2025-01-01'));
      expect(stats.newestLog).toEqual(new Date('2025-01-11'));
    });
  });
});
