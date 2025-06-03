import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from './jwt.strategy';
import { RefreshJwtStrategy } from './refresh-jwt.strategy';

// Mock do ConfigService
const mockConfigService = {
  get: jest.fn(),
};

// Mock do UsersService
const mockUsersService = {
  findOneById: jest.fn(),
};

// Mock das variáveis de ambiente
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

describe('RefreshJwtStrategy', () => {
  let strategy: RefreshJwtStrategy;

  beforeEach(async () => {
    // Mock das configurações JWT
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'JWT_REFRESH_SECRET':
          return 'test-refresh-secret-key';
        default:
          return undefined;
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshJwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    strategy = module.get<RefreshJwtStrategy>(RefreshJwtStrategy);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockPayload: JwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
    };

    const baseDate = new Date('2025-01-01T10:00:00.000Z');

    const mockUser: User = {
      id: 'user-real-id', // ID real do usuário no banco
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashedPassword',
      role: Role.USER,
      createdAt: baseDate,
      updatedAt: baseDate,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    };

    const expectedUserWithRefreshToken = {
      id: 'user-real-id',
      email: 'test@example.com',
      username: 'testuser',
      role: Role.USER,
      createdAt: baseDate,
      updatedAt: baseDate,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
      refreshToken: 'valid-refresh-token',
    };

    const mockRequest = {
      cookies: {
        refresh_token: 'valid-refresh-token',
      },
    } as unknown as Request;

    it('deve validar refresh token válido e retornar usuário com refreshToken', async () => {
      mockUsersService.findOneById.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockRequest, mockPayload);

      expect(result).toEqual(expectedUserWithRefreshToken);
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-123');
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      mockUsersService.findOneById.mockResolvedValue(null);

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        'Usuário não encontrado.',
      );
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-123');
    });

    it('deve lançar UnauthorizedException quando refresh token não está presente', async () => {
      const requestWithoutToken = {
        cookies: {},
      } as unknown as Request;

      await expect(
        strategy.validate(requestWithoutToken, mockPayload),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate(requestWithoutToken, mockPayload),
      ).rejects.toThrow('Refresh token não encontrado.');
    });

    it('deve propagar erro do serviço de usuários', async () => {
      mockUsersService.findOneById.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        'Database error',
      );
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-123');
    });

    it('deve validar refresh token para diferentes roles', async () => {
      const adminPayload: JwtPayload = {
        ...mockPayload,
        role: 'ADMIN',
      };
      const adminUser = {
        ...mockUser,
        id: 'admin-real-id',
        role: 'ADMIN',
      };
      const expectedAdminUserWithRefreshToken = {
        id: 'admin-real-id',
        email: 'test@example.com',
        username: 'testuser',
        role: Role.ADMIN,
        createdAt: baseDate,
        updatedAt: baseDate,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
        passwordResetToken: null,
        passwordResetTokenExpires: null,
        refreshToken: 'valid-refresh-token',
      };

      mockUsersService.findOneById.mockResolvedValue(adminUser);

      const result = await strategy.validate(mockRequest, adminPayload);

      expect(result).toEqual(expectedAdminUserWithRefreshToken);
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-123');
    });
  });

  describe('configuration', () => {
    it('deve ter configurado estratégia corretamente', () => {
      expect(strategy).toBeInstanceOf(RefreshJwtStrategy);
    });
  });
});
