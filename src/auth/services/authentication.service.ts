import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

/**
 * Serviço responsável pela autenticação de usuários
 * Handles login, logout, registro e validação de credenciais
 */
@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Valida as credenciais do usuário (email/username + senha)
   * @param identifier - Email ou nome de usuário
   * @param password - Senha em texto plano
   * @returns Dados do usuário sem a senha ou null se inválido
   */
  async validateUser(
    identifier: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    try {
      // Tenta encontrar o usuário pelo email ou username
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { username: identifier }],
        },
      });

      if (!user) {
        this.logger.warn(`Usuário não encontrado: ${identifier}`);
        return null;
      }

      // Verifica se a senha está correta usando o PasswordService
      const isPasswordValid = await this.passwordService.comparePassword(
        password,
        user.password,
      );

      if (!isPasswordValid) {
        this.logger.warn(`Senha inválida para usuário: ${identifier}`);
        return null;
      }

      // Remove a senha do objeto retornado
      const { password: _, ...userWithoutPassword } = user;

      this.logger.log(`Usuário ${identifier} validado com sucesso`);
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(`Erro ao validar usuário ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Realiza o login do usuário e retorna o access token
   * Define o refresh token em um cookie HttpOnly seguro
   * @param loginDto - Dados de login (identifier + password)
   * @param response - Objeto Response do Express para definir cookies
   * @returns Objeto contendo o access token
   * @throws {UnauthorizedException} Se as credenciais forem inválidas
   */
  async login(
    loginDto: LoginDto,
    response: Response,
  ): Promise<{ accessToken: string }> {
    try {
      const user = await this.validateUser(
        loginDto.identifier,
        loginDto.password,
      );

      if (!user) {
        throw new UnauthorizedException('Credenciais inválidas.');
      }

      // Gera os tokens usando o TokenService
      const tokens = await this.tokenService.generateTokens(user);

      // Define o refresh token em um cookie HttpOnly
      this.tokenService.setRefreshTokenCookie(response, tokens.refreshToken);

      this.logger.log(
        `Login realizado com sucesso para usuário: ${user.email}`,
      );

      // Retorna apenas o access token no corpo da resposta
      return { accessToken: tokens.accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Erro durante login:', error);
      throw new InternalServerErrorException('Erro interno durante login');
    }
  }

  /**
   * Registra um novo usuário no sistema
   * @param registerDto - Dados para criação do usuário
   * @returns Dados do usuário criado (sem a senha)
   * @throws {ConflictException} Se email ou username já existirem
   * @throws {InternalServerErrorException} Se houver erro interno
   */
  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    try {
      // Cria o usuário usando o UsersService
      const newUser = await this.usersService.createUser({
        email: registerDto.email,
        username: registerDto.username,
        password: registerDto.password,
      });

      // Remove a senha do objeto retornado
      const { password: _, ...userWithoutPassword } = newUser;

      this.logger.log(`Novo usuário registrado: ${newUser.email}`);
      return userWithoutPassword;
    } catch (error) {
      // Trata erro de violação de constraint única (email/username já existe)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Tentativa de registro com dados duplicados: ${registerDto.email}`,
        );
        throw new ConflictException('Email ou nome de usuário já cadastrado.');
      }

      this.logger.error('Erro no registro:', error);
      throw new InternalServerErrorException('Erro ao registrar usuário.');
    }
  }

  /**
   * Gera um novo access token usando o refresh token válido
   * @param user - Dados do usuário (sem senha)
   * @returns Objeto contendo o novo access token
   */
  async refreshToken(
    user: Omit<User, 'password'>,
  ): Promise<{ accessToken: string }> {
    try {
      // Gera apenas um novo access token usando o TokenService
      const accessToken = await this.tokenService.generateAccessToken(user);

      this.logger.log(`Token renovado para usuário: ${user.email}`);
      return { accessToken };
    } catch (error) {
      this.logger.error(
        `Erro ao renovar token para usuário ${user.email}:`,
        error,
      );
      throw new InternalServerErrorException('Erro ao renovar token');
    }
  }

  /**
   * Realiza o logout do usuário limpando o cookie do refresh token
   * @param response - Objeto Response do Express para limpar cookies
   */
  logout(response: Response): void {
    try {
      // Remove o refresh token cookie usando o TokenService
      this.tokenService.clearRefreshTokenCookie(response);

      this.logger.log('Logout realizado com sucesso');
    } catch (error) {
      this.logger.error('Erro durante logout:', error);
      throw new InternalServerErrorException('Erro durante logout');
    }
  }

  /**
   * Valida um token e retorna informações do usuário
   * @param token - Token a ser validado
   * @param isRefreshToken - Se true, valida como refresh token
   * @returns Dados do usuário se token válido, null caso contrário
   */
  async validateToken(
    token: string,
    isRefreshToken: boolean = false,
  ): Promise<Omit<User, 'password'> | null> {
    try {
      // Valida o token usando o TokenService
      const payload = await this.tokenService.validateToken(
        token,
        isRefreshToken,
      );

      if (!payload) {
        return null;
      }

      // Busca o usuário atual no banco para garantir que ainda existe
      const user = await this.usersService.findOneById(payload.sub);

      if (!user) {
        this.logger.warn(
          `Usuário não encontrado para token válido: ${payload.sub}`,
        );
        return null;
      }

      // Remove a senha do objeto retornado
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error('Erro ao validar token:', error);
      return null;
    }
  }

  /**
   * Altera a senha de um usuário
   * @param userId - ID do usuário
   * @param currentPassword - Senha atual
   * @param newPassword - Nova senha
   * @returns true se alteração foi bem-sucedida
   * @throws {UnauthorizedException} Se senha atual estiver incorreta
   * @throws {InternalServerErrorException} Se houver erro interno
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      // Busca o usuário
      const user = await this.usersService.findOneById(userId);

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      // Valida a senha atual
      const isCurrentPasswordValid = await this.passwordService.comparePassword(
        currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Senha atual incorreta');
      }

      // Gera hash da nova senha
      const hashedNewPassword =
        await this.passwordService.hashPassword(newPassword);

      // Atualiza a senha no banco
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      this.logger.log(`Senha alterada com sucesso para usuário: ${user.email}`);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Erro ao alterar senha para usuário ${userId}:`, error);
      throw new InternalServerErrorException('Erro ao alterar senha');
    }
  }

  /**
   * Verifica se um usuário existe por email ou username
   * @param identifier - Email ou username
   * @returns true se usuário existe
   */
  async userExists(identifier: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { username: identifier }],
        },
        select: { id: true }, // Seleciona apenas o id para otimizar
      });

      return user !== null;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar existência do usuário ${identifier}:`,
        error,
      );
      return false;
    }
  }
}
