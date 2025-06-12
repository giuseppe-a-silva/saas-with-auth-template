import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_RATE_LIMITS } from '../constants/notification.constants';
import { NotificationChannel } from '../interfaces/notification-dispatcher.interface';
import { RateLimitConfig } from '../types/notification.types';

/**
 * Context de rate limit para um canal/destinatário
 */
interface RateLimitContext {
  channel: string;
  recipient: string;
  requests: number[];
  lastReset: Date;
  burstCount: number;
}

/**
 * Resultado da verificação de rate limit
 */
export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
  currentUsage: {
    perMinute: number;
    perHour: number;
    perDay: number;
    burst: number;
  };
  limits: RateLimitConfig;
}

/**
 * Service para controle de rate limiting de notificações
 * Previne spam e abuso do sistema de notificações
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly contexts = new Map<string, RateLimitContext>();
  private readonly channelLimits = new Map<
    NotificationChannel,
    RateLimitConfig
  >();

  constructor(private readonly configService: ConfigService) {
    this.loadRateLimits();
    this.startCleanupTimer();
  }

  /**
   * Verifica se uma notificação pode ser enviada
   * @param channel Canal da notificação
   * @param recipient Email do destinatário
   * @returns Resultado da verificação
   */
  checkLimit(
    channel: NotificationChannel,
    recipient: string,
  ): Promise<RateLimitResult> {
    const key = this.buildContextKey(channel, recipient);
    const config = this.getChannelConfig(channel);
    const now = new Date();

    // Obtém ou cria context
    let context = this.contexts.get(key);
    if (!context) {
      context = {
        channel,
        recipient,
        requests: [],
        lastReset: now,
        burstCount: 0,
      };
      this.contexts.set(key, context);
    }

    // Remove requests antigos
    this.cleanupOldRequests(context, now);

    // Calcula uso atual
    const usage = this.calculateCurrentUsage(context, now);

    // Verifica limites
    const limitCheck = this.checkLimits(usage, config);

    if (limitCheck.allowed) {
      // Registra nova request
      context.requests.push(now.getTime());
      context.burstCount++;

      this.logger.debug('Rate limit aprovado', {
        channel,
        recipient,
        usage,
        limits: config,
      });
    } else {
      this.logger.warn('Rate limit excedido', {
        channel,
        recipient,
        usage,
        limits: config,
        reason: limitCheck.reason,
      });
    }

    return Promise.resolve({
      allowed: limitCheck.allowed,
      reason: limitCheck.reason,
      retryAfterMs: limitCheck.retryAfterMs,
      currentUsage: usage,
      limits: config,
    });
  }

  /**
   * Registra o envio bem-sucedido de uma notificação
   * @param channel Canal da notificação
   * @param recipient Email do destinatário
   */
  recordSuccess(
    channel: NotificationChannel,
    recipient: string,
  ): Promise<void> {
    // Por enquanto apenas registra no log
    // Pode ser expandido para estatísticas mais detalhadas
    this.logger.debug('Notificação enviada com sucesso', {
      channel,
      recipient,
    });

    return Promise.resolve();
  }

  /**
   * Obtém estatísticas de uso atual
   * @param channel Canal específico (opcional)
   * @returns Estatísticas agregadas
   */
  getUsageStatistics(channel?: NotificationChannel): {
    totalContexts: number;
    activeContexts: number;
    byChannel: Record<string, number>;
  } {
    const stats = {
      totalContexts: this.contexts.size,
      activeContexts: 0,
      byChannel: {} as Record<string, number>,
    };

    const now = new Date();
    const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000;

    for (const context of this.contexts.values()) {
      if (channel && context.channel !== channel.toString()) {
        continue;
      }

      // Conta como ativo se teve requests nos últimos 5 minutos
      const hasRecentActivity = context.requests.some(
        (timestamp) => timestamp > fiveMinutesAgo,
      );

      if (hasRecentActivity) {
        stats.activeContexts++;
      }

      stats.byChannel[context.channel] =
        (stats.byChannel[context.channel] || 0) + 1;
    }

    return stats;
  }

  /**
   * Remove context de rate limit para um destinatário
   * @param channel Canal da notificação
   * @param recipient Email do destinatário
   * @returns true se removido com sucesso
   */
  clearLimit(channel: NotificationChannel, recipient: string): boolean {
    const key = this.buildContextKey(channel, recipient);
    return this.contexts.delete(key);
  }

  /**
   * Limpa todos os contexts de rate limit
   * @returns Número de contexts removidos
   */
  clearAllLimits(): number {
    const count = this.contexts.size;
    this.contexts.clear();
    this.logger.log('Todos os contexts de rate limit foram limpos', { count });
    return count;
  }

  /**
   * Obtém configuração de limits para um canal
   * @param channel Canal da notificação
   * @returns Configuração de rate limit
   */
  private getChannelConfig(channel: NotificationChannel): RateLimitConfig {
    return this.channelLimits.get(channel) ?? DEFAULT_RATE_LIMITS.default;
  }

  /**
   * Carrega configurações de rate limit do ambiente
   */
  private loadRateLimits(): void {
    // Email
    this.channelLimits.set(NotificationChannel.EMAIL, {
      perMinute:
        this.configService.get<number>(
          'NOTIFICATION_EMAIL_LIMIT_PER_MINUTE',
          DEFAULT_RATE_LIMITS.email.perMinute,
        ) ?? DEFAULT_RATE_LIMITS.email.perMinute,
      perHour:
        this.configService.get<number>(
          'NOTIFICATION_EMAIL_LIMIT_PER_HOUR',
          DEFAULT_RATE_LIMITS.email.perHour,
        ) ?? DEFAULT_RATE_LIMITS.email.perHour,
      perDay:
        this.configService.get<number>(
          'NOTIFICATION_EMAIL_LIMIT_PER_DAY',
          DEFAULT_RATE_LIMITS.email.perDay,
        ) ?? DEFAULT_RATE_LIMITS.email.perDay,
      burstLimit:
        this.configService.get<number>(
          'NOTIFICATION_EMAIL_BURST_LIMIT',
          DEFAULT_RATE_LIMITS.email.burstLimit,
        ) ?? DEFAULT_RATE_LIMITS.email.burstLimit,
    });

    // Push
    this.channelLimits.set(NotificationChannel.PUSH, {
      perMinute:
        this.configService.get<number>(
          'NOTIFICATION_PUSH_LIMIT_PER_MINUTE',
          DEFAULT_RATE_LIMITS.push.perMinute,
        ) ?? DEFAULT_RATE_LIMITS.push.perMinute,
      perHour:
        this.configService.get<number>(
          'NOTIFICATION_PUSH_LIMIT_PER_HOUR',
          DEFAULT_RATE_LIMITS.push.perHour,
        ) ?? DEFAULT_RATE_LIMITS.push.perHour,
      perDay:
        this.configService.get<number>(
          'NOTIFICATION_PUSH_LIMIT_PER_DAY',
          DEFAULT_RATE_LIMITS.push.perDay,
        ) ?? DEFAULT_RATE_LIMITS.push.perDay,
      burstLimit:
        this.configService.get<number>(
          'NOTIFICATION_PUSH_BURST_LIMIT',
          DEFAULT_RATE_LIMITS.push.burstLimit,
        ) ?? DEFAULT_RATE_LIMITS.push.burstLimit,
    });

    // Realtime
    this.channelLimits.set(NotificationChannel.REALTIME, {
      perMinute:
        this.configService.get<number>(
          'NOTIFICATION_REALTIME_LIMIT_PER_MINUTE',
          DEFAULT_RATE_LIMITS.realtime.perMinute,
        ) ?? DEFAULT_RATE_LIMITS.realtime.perMinute,
      perHour:
        this.configService.get<number>(
          'NOTIFICATION_REALTIME_LIMIT_PER_HOUR',
          DEFAULT_RATE_LIMITS.realtime.perHour,
        ) ?? DEFAULT_RATE_LIMITS.realtime.perHour,
      perDay:
        this.configService.get<number>(
          'NOTIFICATION_REALTIME_LIMIT_PER_DAY',
          DEFAULT_RATE_LIMITS.realtime.perDay,
        ) ?? DEFAULT_RATE_LIMITS.realtime.perDay,
      burstLimit:
        this.configService.get<number>(
          'NOTIFICATION_REALTIME_BURST_LIMIT',
          DEFAULT_RATE_LIMITS.realtime.burstLimit,
        ) ?? DEFAULT_RATE_LIMITS.realtime.burstLimit,
    });

    // Third Party removido da nova arquitetura event-driven

    this.logger.log('Rate limits configurados para todos os canais');
  }

  /**
   * Constrói chave única para context
   * @param channel Canal da notificação
   * @param recipient Email do destinatário
   * @returns Chave única
   */
  private buildContextKey(
    channel: NotificationChannel,
    recipient: string,
  ): string {
    return `${channel}:${recipient.toLowerCase()}`;
  }

  /**
   * Remove requests antigas do context
   * @param context Context a limpar
   * @param now Data atual
   */
  private cleanupOldRequests(context: RateLimitContext, now: Date): void {
    const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

    // Remove requests antigas (mais de 24h)
    context.requests = context.requests.filter(
      (timestamp) => timestamp > oneDayAgo,
    );

    // Reset burst count a cada minuto
    if (now.getTime() - context.lastReset.getTime() > 60 * 1000) {
      context.burstCount = 0;
      context.lastReset = now;
    }
  }

  /**
   * Calcula uso atual baseado no histórico
   * @param context Context com histórico
   * @param now Data atual
   * @returns Uso atual em diferentes períodos
   */
  private calculateCurrentUsage(
    context: RateLimitContext,
    now: Date,
  ): {
    perMinute: number;
    perHour: number;
    perDay: number;
    burst: number;
  } {
    const nowMs = now.getTime();
    const oneMinuteAgo = nowMs - 60 * 1000;
    const oneHourAgo = nowMs - 60 * 60 * 1000;
    const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;

    return {
      perMinute: context.requests.filter((t) => t > oneMinuteAgo).length,
      perHour: context.requests.filter((t) => t > oneHourAgo).length,
      perDay: context.requests.filter((t) => t > oneDayAgo).length,
      burst: context.burstCount,
    };
  }

  /**
   * Verifica se os limites foram excedidos
   * @param usage Uso atual
   * @param config Configuração de limites
   * @returns Resultado da verificação
   */
  private checkLimits(
    usage: {
      perMinute: number;
      perHour: number;
      perDay: number;
      burst: number;
    },
    config: RateLimitConfig,
  ): { allowed: boolean; reason?: string; retryAfterMs?: number } {
    // Verifica burst limit (imediato)
    if (usage.burst >= config.burstLimit) {
      return {
        allowed: false,
        reason: 'Burst limit exceeded',
        retryAfterMs: 60 * 1000, // 1 minuto
      };
    }

    // Verifica limite por minuto
    if (usage.perMinute >= config.perMinute) {
      return {
        allowed: false,
        reason: 'Per-minute limit exceeded',
        retryAfterMs: 60 * 1000, // 1 minuto
      };
    }

    // Verifica limite por hora
    if (usage.perHour >= config.perHour) {
      return {
        allowed: false,
        reason: 'Per-hour limit exceeded',
        retryAfterMs: 60 * 60 * 1000, // 1 hora
      };
    }

    // Verifica limite por dia
    if (usage.perDay >= config.perDay) {
      return {
        allowed: false,
        reason: 'Per-day limit exceeded',
        retryAfterMs: 24 * 60 * 60 * 1000, // 24 horas
      };
    }

    return { allowed: true };
  }

  /**
   * Inicia timer de limpeza automática
   */
  private startCleanupTimer(): void {
    const intervalMs = this.configService.get<number>(
      'NOTIFICATION_RATE_LIMIT_CLEANUP_INTERVAL',
      5 * 60 * 1000, // 5 minutos
    );

    setInterval(() => {
      this.performCleanup();
    }, intervalMs);

    this.logger.log('Timer de limpeza de rate limit iniciado', {
      intervalMs,
    });
  }

  /**
   * Executa limpeza de contexts inativos
   */
  private performCleanup(): void {
    const now = new Date();
    const inactiveThreshold = now.getTime() - 60 * 60 * 1000; // 1 hora
    let removed = 0;

    for (const [key, context] of this.contexts.entries()) {
      // Remove context se não tem requests na última hora
      const hasRecentActivity = context.requests.some(
        (timestamp) => timestamp > inactiveThreshold,
      );

      if (!hasRecentActivity) {
        this.contexts.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug('Cleanup de rate limit executado', {
        removed,
        remaining: this.contexts.size,
      });
    }
  }
}
