import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { AuthenticationService } from './authentication.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  const mockUsersService = {
    findOneById: jest.fn(),
    createUser: jest.fn(),
  };

  const mockPasswordService = {
    comparePassword: jest.fn(),
    hashPassword: jest.fn(),
  };

  const mockTokenService = {
    generateTokens: jest.fn(),
    generateAccessToken: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
    clearRefreshTokenCookie: jest.fn(),
    validateToken: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokenService, useValue: mockTokenService },
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
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPasswordService.comparePassword.mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'plainPassword',
      );

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
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
