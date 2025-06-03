import { Test, TestingModule } from '@nestjs/testing';
import { User as PrismaUser, Role } from '@prisma/client';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticationService } from './services/authentication.service';

// Mock Response object
const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
} as unknown as Response;

// Mock AuthenticationService
const mockAuthenticationService = {
  validateUser: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  changePassword: jest.fn(),
  validateToken: jest.fn(),
  userExists: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let authenticationService: typeof mockAuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthenticationService,
          useValue: mockAuthenticationService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authenticationService = module.get(AuthenticationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    const identifier = 'test@example.com';
    const password = 'password123';

    it('deve retornar o usuário (sem senha) se as credenciais forem válidas', async () => {
      const expectedUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      authenticationService.validateUser.mockResolvedValue(expectedUser);

      const result = await service.validateUser(identifier, password);

      expect(authenticationService.validateUser).toHaveBeenCalledWith(
        identifier,
        password,
      );
      expect(result).toEqual(expectedUser);
    });

    it('deve retornar null se o usuário não for encontrado', async () => {
      authenticationService.validateUser.mockResolvedValue(null);

      const result = await service.validateUser(identifier, password);

      expect(authenticationService.validateUser).toHaveBeenCalledWith(
        identifier,
        password,
      );
      expect(result).toBeNull();
    });

    it('deve retornar null se a senha estiver incorreta', async () => {
      authenticationService.validateUser.mockResolvedValue(null);

      const result = await service.validateUser(identifier, 'wrongpassword');

      expect(authenticationService.validateUser).toHaveBeenCalledWith(
        identifier,
        'wrongpassword',
      );
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      identifier: 'test@example.com',
      password: 'password123',
    };

    it('deve retornar accessToken se o login for bem-sucedido', async () => {
      const expectedResult = { accessToken: 'access-token-123' };

      authenticationService.login.mockResolvedValue(expectedResult);

      const result = await service.login(loginDto, mockResponse);

      expect(authenticationService.login).toHaveBeenCalledWith(
        loginDto,
        mockResponse,
      );
      expect(result).toEqual(expectedResult);
    });

    it('deve propagar erro se AuthenticationService lançar exceção', async () => {
      const error = new Error('Login failed');
      authenticationService.login.mockRejectedValue(error);

      await expect(service.login(loginDto, mockResponse)).rejects.toThrow(
        error,
      );
      expect(authenticationService.login).toHaveBeenCalledWith(
        loginDto,
        mockResponse,
      );
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
    };

    it('deve registrar um novo usuário e retornar seus dados (sem senha)', async () => {
      const expectedResult = {
        id: '2',
        email: 'new@example.com',
        username: 'newuser',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      authenticationService.register.mockResolvedValue(expectedResult);

      const result = await service.register(registerDto);

      expect(authenticationService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });

    it('deve propagar erro se AuthenticationService lançar exceção', async () => {
      const error = new Error('Registration failed');
      authenticationService.register.mockRejectedValue(error);

      await expect(service.register(registerDto)).rejects.toThrow(error);
      expect(authenticationService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refreshToken', () => {
    const user: Omit<PrismaUser, 'password'> = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    };

    it('deve gerar e retornar um novo accessToken', async () => {
      const expectedResult = { accessToken: 'new-access-token' };

      authenticationService.refreshToken.mockResolvedValue(expectedResult);

      const result = await service.refreshToken(user);

      expect(authenticationService.refreshToken).toHaveBeenCalledWith(user);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout', () => {
    it('deve chamar AuthenticationService.logout', () => {
      service.logout(mockResponse);

      expect(authenticationService.logout).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('changePassword', () => {
    const userId = '1';
    const currentPassword = 'oldPassword';
    const newPassword = 'newPassword123';

    it('deve alterar senha com sucesso', async () => {
      authenticationService.changePassword.mockResolvedValue(true);

      const result = await service.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      expect(authenticationService.changePassword).toHaveBeenCalledWith(
        userId,
        currentPassword,
        newPassword,
      );
      expect(result).toBe(true);
    });

    it('deve propagar erro se AuthenticationService lançar exceção', async () => {
      const error = new Error('Password change failed');
      authenticationService.changePassword.mockRejectedValue(error);

      await expect(
        service.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(error);
    });
  });

  describe('validateToken', () => {
    const token = 'test-token';

    it('deve validar token de acesso', async () => {
      const expectedUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      authenticationService.validateToken.mockResolvedValue(expectedUser);

      const result = await service.validateToken(token, false);

      expect(authenticationService.validateToken).toHaveBeenCalledWith(
        token,
        false,
      );
      expect(result).toEqual(expectedUser);
    });

    it('deve validar refresh token', async () => {
      const expectedUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      authenticationService.validateToken.mockResolvedValue(expectedUser);

      const result = await service.validateToken(token, true);

      expect(authenticationService.validateToken).toHaveBeenCalledWith(
        token,
        true,
      );
      expect(result).toEqual(expectedUser);
    });
  });

  describe('userExists', () => {
    const identifier = 'test@example.com';

    it('deve retornar true se usuário existir', async () => {
      authenticationService.userExists.mockResolvedValue(true);

      const result = await service.userExists(identifier);

      expect(authenticationService.userExists).toHaveBeenCalledWith(identifier);
      expect(result).toBe(true);
    });

    it('deve retornar false se usuário não existir', async () => {
      authenticationService.userExists.mockResolvedValue(false);

      const result = await service.userExists(identifier);

      expect(authenticationService.userExists).toHaveBeenCalledWith(identifier);
      expect(result).toBe(false);
    });
  });
});
