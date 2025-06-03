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
import { EmailVerificationService } from './email-verification.service';
import { PasswordService } from './password.service';
import { SecurityNotificationService } from './security-notification.service';
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
    private readonly emailVerificationService: EmailVerificationService,
    private readonly securityNotificationService: SecurityNotificationService,
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

      // Verifica se o email foi verificado
      if (!user.emailVerified) {
        this.logger.warn(
          `Tentativa de login com email não verificado: ${identifier}`,
        );
        throw new UnauthorizedException(
          'Email não verificado. Verifique sua caixa de entrada.',
        );
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Erro ao validar usuário ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Realiza login de um usuário validado
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
      // Valida as credenciais do usuário
      const validatedUser = await this.validateUser(
        loginDto.identifier,
        loginDto.password,
      );

      if (!validatedUser) {
        throw new UnauthorizedException('Credenciais inválidas.');
      }

      // Verifica se o email foi verificado
      if (!validatedUser.emailVerified) {
        throw new UnauthorizedException(
          'Por favor, verifique seu email antes de fazer login.',
        );
      }

      // Gera os tokens JWT (access + refresh)
      const tokens = await this.tokenService.generateTokens(validatedUser);

      // Define o refresh token como um cookie HttpOnly seguro
      this.tokenService.setRefreshTokenCookie(response, tokens.refreshToken);

      // Envia notificação de login
      try {
        await this.securityNotificationService.sendLoginNotification(
          {
            id: validatedUser.id,
            username: validatedUser.username,
            email: validatedUser.email,
          },
          {
            // TODO: Extrair IP e device do contexto da requisição
            ipAddress: 'Não disponível',
            device: 'Navegador',
            location: 'Não disponível',
          },
        );
      } catch (notificationError) {
        // Log do erro mas não falha a operação principal
        this.logger.warn(
          `Falha ao enviar notificação de login para ${validatedUser.email}:`,
          notificationError,
        );
      }

      this.logger.log(
        `Login bem-sucedido para usuário: ${validatedUser.email}`,
      );

      // Retorna apenas o access token (refresh token fica no cookie)
      return { accessToken: tokens.accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Erro no login para ${loginDto.identifier}:`, error);
      throw new InternalServerErrorException('Erro interno no login.');
    }
  }

  /**
   * Registra um novo usuário no sistema com verificação obrigatória de email
   * @param registerDto - Dados para criação do usuário
   * @returns Dados do usuário criado (sem a senha)
   * @throws {ConflictException} Se email ou username já existirem
   * @throws {InternalServerErrorException} Se houver erro interno
   */
  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    try {
      // Cria o usuário com emailVerified=false
      const newUser = await this.usersService.createUser({
        email: registerDto.email,
        username: registerDto.username,
        password: registerDto.password,
      });

      // Envia email de verificação
      const emailSent =
        await this.emailVerificationService.sendVerificationEmail(
          newUser.id,
          newUser.email,
          newUser.username,
        );

      if (!emailSent) {
        this.logger.warn(
          `Falha ao enviar email de verificação para: ${newUser.email}`,
        );
        // Não falha o registro, apenas loga o aviso
      }

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

      // Envia notificação de segurança sobre alteração de senha
      try {
        await this.securityNotificationService.sendPasswordChangedNotification(
          {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          {
            // TODO: Extrair IP e device do contexto da requisição
            ipAddress: 'Não disponível',
            device: 'Navegador',
          },
        );
      } catch (notificationError) {
        // Log do erro mas não falha a operação principal
        this.logger.warn(
          `Falha ao enviar notificação de alteração de senha para ${user.email}:`,
          notificationError,
        );
      }

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
