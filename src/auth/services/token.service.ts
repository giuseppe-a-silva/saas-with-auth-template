import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { Response } from 'express';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * Serviço responsável pelo gerenciamento de tokens JWT
 * Handles geração, validação e refresh de access e refresh tokens
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Gera tokens de acesso e refresh para um usuário
   * @param user - Dados do usuário (sem senha)
   * @returns Objeto contendo access token e refresh token
   */
  async generateTokens(
    user: Omit<User, 'password'>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(payload),
        this.generateRefreshToken(payload),
      ]);

      this.logger.debug(`Tokens gerados para usuário: ${user.email}`);
      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(
        `Erro ao gerar tokens para usuário ${user.email}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Gera apenas um novo access token usando payload existente
   * @param user - Dados do usuário (sem senha)
   * @returns Objeto contendo o novo access token
   */
  async generateAccessToken(
    payload: JwtPayload | Omit<User, 'password'>,
  ): Promise<string> {
    try {
      // Normaliza payload se vier de User
      const jwtPayload: JwtPayload =
        'sub' in payload
          ? payload
          : {
              sub: payload.id,
              email: payload.email,
              username: payload.username,
              role: payload.role,
            };

      const accessToken = await this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRY', '15m'),
      });

      this.logger.debug(
        `Access token gerado para usuário: ${jwtPayload.email}`,
      );
      return accessToken;
    } catch (error) {
      this.logger.error('Erro ao gerar access token:', error);
      throw error;
    }
  }

  /**
   * Gera um refresh token
   * @param payload - Payload JWT do usuário
   * @returns Refresh token assinado
   * @private
   */
  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    try {
      const refreshToken = await this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRY', '7d'),
      });

      this.logger.debug(`Refresh token gerado para usuário: ${payload.email}`);
      return refreshToken;
    } catch (error) {
      this.logger.error('Erro ao gerar refresh token:', error);
      throw error;
    }
  }

  /**
   * Define o refresh token em um cookie HttpOnly seguro
   * @param response - Objeto Response do Express
   * @param refreshToken - Token de refresh a ser armazenado
   */
  setRefreshTokenCookie(response: Response, refreshToken: string): void {
    try {
      const refreshTokenExpiry = this.configService.get<string>(
        'REFRESH_TOKEN_EXPIRY',
        '7d',
      );
      const maxAge = this.parseExpiryToMilliseconds(refreshTokenExpiry);

      response.cookie('refresh_token', refreshToken, {
        httpOnly: true, // Impede acesso via JavaScript no cliente
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'strict', // Ajuda a prevenir ataques CSRF
        maxAge, // Tempo de vida do cookie em milissegundos
        path: '/', // Cookie disponível em todo o site
      });

      this.logger.debug('Refresh token cookie definido com sucesso');
    } catch (error) {
      this.logger.error('Erro ao definir refresh token cookie:', error);
      throw error;
    }
  }

  /**
   * Remove o refresh token do cookie
   * @param response - Objeto Response do Express
   */
  clearRefreshTokenCookie(response: Response): void {
    try {
      response.clearCookie('refresh_token', {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'strict',
        path: '/',
      });

      this.logger.debug('Refresh token cookie removido com sucesso');
    } catch (error) {
      this.logger.error('Erro ao remover refresh token cookie:', error);
      throw error;
    }
  }

  /**
   * Valida se um token JWT é válido
   * @param token - Token a ser validado
   * @param isRefreshToken - Se true, usa secret de refresh token
   * @returns Payload do token se válido
   */
  async validateToken(
    token: string,
    isRefreshToken: boolean = false,
  ): Promise<JwtPayload | null> {
    try {
      const secret = isRefreshToken
        ? this.configService.get<string>('JWT_REFRESH_SECRET')
        : this.configService.get<string>('JWT_SECRET');

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });

      this.logger.debug(
        `Token ${isRefreshToken ? 'refresh' : 'access'} validado com sucesso`,
      );
      return payload;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn(
        `Token ${isRefreshToken ? 'refresh' : 'access'} inválido:`,
        errorMessage,
      );
      return null;
    }
  }

  /**
   * Converte string de tempo de expiração para milissegundos
   * @param expiry - String no formato '7d', '15m', '30s', etc.
   * @returns Tempo em milissegundos
   * @throws {Error} Se a unidade de tempo for inválida
   * @private
   */
  private parseExpiryToMilliseconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    if (isNaN(value)) {
      throw new Error(`Valor de expiração inválido: ${expiry}`);
    }

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unidade de expiração inválida: ${unit}`);
    }
  }

  /**
   * Decodifica um token sem validar a assinatura (para debug)
   * @param token - Token a ser decodificado
   * @returns Payload decodificado ou null se inválido
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const decoded: string | Record<string, unknown> | null =
        this.jwtService.decode(token);
      if (
        decoded &&
        typeof decoded === 'object' &&
        'sub' in decoded &&
        'email' in decoded &&
        'username' in decoded &&
        'role' in decoded
      ) {
        return decoded as unknown as JwtPayload;
      }
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn('Erro ao decodificar token:', errorMessage);
      return null;
    }
  }
}
