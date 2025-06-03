import { Test, TestingModule } from '@nestjs/testing';
import { User as PrismaUser, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { AuthenticationService } from './authentication.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordService } from './password.service';
import { SecurityNotificationService } from './security-notification.service';
import { TokenService } from './token.service';

// Mock services
const mockUsersService = {
  findOneByEmail: jest.fn(),
  findOneByUsername: jest.fn(),
  create: jest.fn(),
};

const mockPasswordService = {
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
};

const mockTokenService = {
  generateTokens: jest.fn(),
  generateRefreshToken: jest.fn(),
};

const mockEmailVerificationService = {
  sendVerificationEmail: jest.fn(),
  verifyEmailToken: jest.fn(),
  isTokenValid: jest.fn(),
  resendVerificationEmail: jest.fn(),
};

const mockSecurityNotificationService = {
  sendLoginNotification: jest.fn(),
  sendPasswordChangedNotification: jest.fn(),
  sendDataChangedNotification: jest.fn(),
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokenService, useValue: mockTokenService },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: SecurityNotificationService,
          useValue: mockSecurityNotificationService,
        },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user: PrismaUser = {
        id: 'user-id',
        email,
        username: 'testuser',
        password: 'hashedPassword',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
        passwordResetToken: null,
        passwordResetTokenExpires: null,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(user);
      mockPasswordService.comparePassword.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified,
        emailVerificationToken: user.emailVerificationToken,
        emailVerificationTokenExpires: user.emailVerificationTokenExpires,
        passwordResetToken: user.passwordResetToken,
        passwordResetTokenExpires: user.passwordResetTokenExpires,
      });
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email }, { username: email }],
        },
      });
      expect(mockPasswordService.comparePassword).toHaveBeenCalledWith(
        password,
        user.password,
      );
    });

    it('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email }, { username: email }],
        },
      });
      expect(mockPasswordService.comparePassword).not.toHaveBeenCalled();
    });
  });

  // TODO: Adicionar mais testes específicos conforme necessário
  // - login
  // - register
  // - refreshToken
  // - logout
  // - validateToken
  // - changePassword
  // - userExists
});
