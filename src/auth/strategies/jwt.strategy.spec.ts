import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { JwtPayload, JwtStrategy } from './jwt.strategy';

// Mock do ConfigService
const mockConfigService = {
  get: jest.fn(),
};

// Mock do UsersService
const mockUsersService = {
  findOneById: jest.fn(),
};

// Mock das variáveis de ambiente
process.env.JWT_SECRET = 'test-secret-key';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    // Mock das configurações JWT
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'JWT_SECRET':
          return 'test-secret-key';
        default:
          return undefined;
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
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

    strategy = module.get<JwtStrategy>(JwtStrategy);

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
      role: 'USER',
      createdAt: baseDate,
      updatedAt: baseDate,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    };

    const expectedUserWithoutPassword = {
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
    };

    it('deve validar payload JWT válido e retornar usuário sem senha', async () => {
      mockUsersService.findOneById.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual(expectedUserWithoutPassword);
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-123');
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      mockUsersService.findOneById.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Usuário não encontrado ou token inválido.',
      );
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-123');
    });

    it('deve propagar erro do serviço de usuários', async () => {
      mockUsersService.findOneById.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Database error',
      );
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-123');
    });

    it('deve validar payload com diferentes roles', async () => {
      const adminPayload: JwtPayload = {
        ...mockPayload,
        role: 'ADMIN',
      };
      const adminUser = {
        ...mockUser,
        id: 'admin-real-id',
        role: 'ADMIN',
      };
      const expectedAdminUserWithoutPassword = {
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
      };

      mockUsersService.findOneById.mockResolvedValue(adminUser);

      const result = await strategy.validate(adminPayload);

      expect(result).toEqual(expectedAdminUserWithoutPassword);
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-123');
    });
  });

  describe('configuration', () => {
    it('deve ter configurado estratégia corretamente', () => {
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });
  });
});
