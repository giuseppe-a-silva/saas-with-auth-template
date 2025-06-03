import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { User } from '../../users/entities/user.entity';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthPayload } from '../entities/auth-payload.entity';
import { AuthResolver } from './auth.resolver';

// Mock do AuthService
const mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
};

// Mock do Response do Express
const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
} as unknown as Response;

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      identifier: 'test@example.com',
      password: 'password123',
    };

    const context = { res: mockResponse };
    const expectedResult: AuthPayload = {
      accessToken: 'mock-access-token',
    };

    it('deve autenticar usuário com credenciais válidas', async () => {
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await resolver.login(loginDto, context);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto, context.res);
    });

    it('deve lançar exceção para credenciais inválidas', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Credenciais inválidas'),
      );

      await expect(resolver.login(loginDto, context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto, context.res);
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'novo@example.com',
      username: 'novousuario',
      password: 'senhasegura123',
    };

    const expectedUser: Omit<User, 'password'> = {
      id: 'user-123',
      email: 'novo@example.com',
      username: 'novousuario',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('deve registrar novo usuário com dados válidos', async () => {
      mockAuthService.register.mockResolvedValue(expectedUser);

      const result = await resolver.register(registerDto);

      expect(result).toEqual(expectedUser);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('deve lançar exceção para email já existente', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('Email já está em uso'),
      );

      await expect(resolver.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refreshToken', () => {
    const mockUser: Omit<User, 'password'> = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const context = { req: { user: mockUser } };
    const expectedResult: AuthPayload = {
      accessToken: 'new-access-token',
    };

    it('deve gerar novo access token com refresh token válido', async () => {
      mockAuthService.refreshToken.mockResolvedValue(expectedResult);

      const result = await resolver.refreshToken(context);

      expect(result).toEqual(expectedResult);
      expect(authService.refreshToken).toHaveBeenCalledWith(mockUser);
    });

    it('deve lançar exceção para refresh token inválido', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Token de refresh inválido'),
      );

      await expect(resolver.refreshToken(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.refreshToken).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('logout', () => {
    const context = { res: mockResponse };

    it('deve realizar logout com sucesso', () => {
      const result = resolver.logout(context);

      expect(result).toEqual({
        success: true,
        message: 'Logout realizado com sucesso.',
      });
      expect(authService.logout).toHaveBeenCalledWith(context.res);
    });
  });
});
