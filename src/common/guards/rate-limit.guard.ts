import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * Configuração de rate limiting por endpoint
 */
interface RateLimitConfig {
  windowMs: number; // Janela de tempo em milissegundos
  maxRequests: number; // Máximo de requisições por janela
}

/**
 * Metadados para configurar rate limiting
 */
export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Decorator para aplicar rate limiting em endpoints
 * @param config - Configuração de limite de requisições
 */
export const RateLimit = (config: RateLimitConfig): MethodDecorator =>
  Reflect.metadata(RATE_LIMIT_KEY, config);

/**
 * Guard simples de rate limiting por IP
 * Implementação em memória para MVP - adequado para single instance
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(private readonly reflector: Reflector) {}

  /**
   * Verifica se a requisição está dentro dos limites configurados
   * @param context - Contexto de execução do NestJS
   * @returns true se permitido, false caso contrário
   */
  canActivate(context: ExecutionContext): boolean {
    const rateLimitConfig = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não há configuração de rate limit, permite a requisição
    if (!rateLimitConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.extractClientIp(request);
    const now = Date.now();

    // Chave única por IP e endpoint
    const key = `${clientIp}:${request.path}`;

    // Obtém ou cria contador para este IP/endpoint
    let requestData = this.requestCounts.get(key);

    // Se não existe ou a janela expirou, reseta o contador
    if (!requestData || now > requestData.resetTime) {
      requestData = {
        count: 0,
        resetTime: now + rateLimitConfig.windowMs,
      };
    }

    // Incrementa o contador
    requestData.count++;
    this.requestCounts.set(key, requestData);

    // Verifica se excedeu o limite
    if (requestData.count > rateLimitConfig.maxRequests) {
      this.logger.warn(
        `Rate limit excedido para IP ${clientIp} no endpoint ${request.path}`,
        {
          ip: clientIp,
          endpoint: request.path,
          count: requestData.count,
          limit: rateLimitConfig.maxRequests,
          windowMs: rateLimitConfig.windowMs,
        },
      );

      throw new HttpException(
        `Muitas requisições. Limite: ${rateLimitConfig.maxRequests} por ${rateLimitConfig.windowMs / 1000}s`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Limpa entradas expiradas periodicamente (cleanup simples)
    if (Math.random() < 0.01) {
      // 1% de chance de executar cleanup
      this.cleanupExpiredEntries(now);
    }

    return true;
  }

  /**
   * Extrai o IP real do cliente considerando proxies
   * @param request - Objeto Request do Express
   * @returns IP do cliente
   * @private
   */
  private extractClientIp(request: Request): string {
    return (
      (request.get('x-forwarded-for') ?? '').split(',').shift()?.trim() ??
      request.get('x-real-ip') ??
      request.socket.remoteAddress ??
      'unknown'
    );
  }

  /**
   * Remove entradas expiradas do cache em memória
   * @param now - Timestamp atual
   * @private
   */
  private cleanupExpiredEntries(now: number): void {
    let cleanedCount = 0;
    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Limpeza de rate limit: ${cleanedCount} entradas removidas`,
      );
    }
  }
}
