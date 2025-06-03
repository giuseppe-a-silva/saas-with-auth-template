import { Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticationService } from './services/authentication.service';

/**
 * Serviço principal responsável pela orquestração da autenticação e autorização
 * Delega operações específicas para serviços especializados (nova arquitetura)
 *
 * @remarks Este serviço atua como facade/orquestrador para:
 * - AuthenticationService: validação, login, registro, tokens
 * - PasswordService: operações com senhas
 * - TokenService: geração e validação de tokens JWT
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly authenticationService: AuthenticationService) {}

  /**
   * Valida as credenciais do usuário (email/username + senha)
   * @param identifier - Email ou nome de usuário
   * @param password - Senha em texto plano
   * @returns Dados do usuário sem a senha ou null se inválido
   * @throws {Error} Se houver erro na validação
   */
  async validateUser(
    identifier: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    this.logger.debug(`Validando usuário: ${identifier}`);
    return this.authenticationService.validateUser(identifier, password);
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
    this.logger.debug(`Realizando login para: ${loginDto.identifier}`);
    return this.authenticationService.login(loginDto, response);
  }

  /**
   * Registra um novo usuário no sistema
   * @param registerDto - Dados para criação do usuário
   * @returns Dados do usuário criado (sem a senha)
   * @throws {ConflictException} Se email ou username já existirem
   * @throws {InternalServerErrorException} Se houver erro interno
   */
  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    this.logger.debug(`Registrando novo usuário: ${registerDto.email}`);
    return this.authenticationService.register(registerDto);
  }

  /**
   * Gera um novo access token usando o refresh token válido
   * @param user - Dados do usuário (sem senha)
   * @returns Objeto contendo o novo access token
   */
  async refreshToken(
    user: Omit<User, 'password'>,
  ): Promise<{ accessToken: string }> {
    this.logger.debug(`Renovando token para usuário: ${user.email}`);
    return this.authenticationService.refreshToken(user);
  }

  /**
   * Realiza o logout do usuário limpando o cookie do refresh token
   * @param response - Objeto Response do Express para limpar cookies
   */
  logout(response: Response): void {
    this.logger.debug('Realizando logout');
    this.authenticationService.logout(response);
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
    this.logger.debug(`Alterando senha para usuário: ${userId}`);
    return this.authenticationService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
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
    this.logger.debug(`Validando token${isRefreshToken ? ' (refresh)' : ''}`);
    return this.authenticationService.validateToken(token, isRefreshToken);
  }

  /**
   * Verifica se um usuário existe por email ou username
   * @param identifier - Email ou username
   * @returns true se usuário existe
   */
  async userExists(identifier: string): Promise<boolean> {
    this.logger.debug(`Verificando existência do usuário: ${identifier}`);
    return this.authenticationService.userExists(identifier);
  }
}
