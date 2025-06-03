import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_RETRY_CONFIG } from '../constants/notification.constants';
import {
  NotificationResult,
  NotificationStatus,
} from '../interfaces/notification-dispatcher.interface';
import { RetryConfig, SendNotificationData } from '../types/notification.types';

/**
 * Dados de uma tentativa de retry
 */
export interface RetryAttempt {
  attemptNumber: number;
  executedAt: Date;
  result: NotificationResult;
  nextRetryAt?: Date;
}

/**
 * Contexto de retry para uma notificação
 */
export interface RetryContext {
  id: string;
  templateName: string;
  channel: string;
  recipient: string;
  originalPayload: SendNotificationData;
  attempts: RetryAttempt[];
  status: 'pending' | 'retrying' | 'success' | 'failed';
  createdAt: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
}

/**
 * Service responsável pelo sistema de retry para falhas de notificação
 * Implementa backoff exponencial e limites configuráveis
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly retryConfig: RetryConfig;
  private readonly retryContexts = new Map<string, RetryContext>();

  constructor(private readonly configService: ConfigService) {
    this.retryConfig = this.loadRetryConfig();
    this.logger.log('Sistema de retry inicializado', {
      config: this.retryConfig,
    });
  }

  /**
   * Registra uma falha para retry
   * @param notificationId ID único da notificação
   * @param templateName Nome do template
   * @param channel Canal da notificação
   * @param recipient Destinatário
   * @param originalPayload Payload original
   * @param result Resultado da falha
   * @returns Context de retry criado
   */
  registerFailure(
    notificationId: string,
    templateName: string,
    channel: string,
    recipient: string,
    originalPayload: SendNotificationData,
    result: NotificationResult,
  ): RetryContext {
    const context: RetryContext = {
      id: notificationId,
      templateName,
      channel,
      recipient,
      originalPayload,
      attempts: [
        {
          attemptNumber: 1,
          executedAt: new Date(),
          result,
        },
      ],
      status: 'pending',
      createdAt: new Date(),
      lastAttemptAt: new Date(),
    };

    // Calcula próxima tentativa se ainda dentro do limite
    if (this.shouldRetry(context)) {
      context.nextRetryAt = this.calculateNextRetry(context.attempts.length);
      context.status = 'retrying';
    } else {
      context.status = 'failed';
    }

    this.retryContexts.set(notificationId, context);

    this.logger.warn('Falha registrada para retry', {
      notificationId,
      templateName,
      channel,
      recipient,
      attemptNumber: 1,
      nextRetryAt: context.nextRetryAt,
      status: context.status,
    });

    return context;
  }

  /**
   * Registra nova tentativa de retry
   * @param notificationId ID da notificação
   * @param result Resultado da tentativa
   * @returns Context atualizado
   */
  registerRetryAttempt(
    notificationId: string,
    result: NotificationResult,
  ): RetryContext | null {
    const context = this.retryContexts.get(notificationId);

    if (!context) {
      this.logger.error('Context de retry não encontrado', {
        notificationId,
      });
      return null;
    }

    const attemptNumber = context.attempts.length + 1;
    const attempt: RetryAttempt = {
      attemptNumber,
      executedAt: new Date(),
      result,
    };

    context.attempts.push(attempt);
    context.lastAttemptAt = new Date();

    if (result.status === NotificationStatus.SENT) {
      // Sucesso - remove do retry
      context.status = 'success';
      context.nextRetryAt = undefined;

      this.logger.log('Retry bem-sucedido', {
        notificationId,
        attemptNumber,
        totalAttempts: context.attempts.length,
      });

      // Remove context após sucesso (pode ser configurável)
      this.retryContexts.delete(notificationId);
    } else {
      // Falha - verifica se deve tentar novamente
      if (this.shouldRetry(context)) {
        context.nextRetryAt = this.calculateNextRetry(attemptNumber);
        context.status = 'retrying';

        this.logger.warn('Retry falhado, agendando próxima tentativa', {
          notificationId,
          attemptNumber,
          nextRetryAt: context.nextRetryAt,
        });
      } else {
        context.status = 'failed';
        context.nextRetryAt = undefined;

        this.logger.error('Limite de retry excedido', {
          notificationId,
          attemptNumber,
          totalAttempts: context.attempts.length,
          finalError: result.error,
        });

        // Mantém o context para auditoria, mas marca como falhado
      }
    }

    return context;
  }

  /**
   * Obtém todas as notificações prontas para retry
   * @returns Array de contexts prontos para retry
   */
  getNotificationsReadyForRetry(): RetryContext[] {
    const now = new Date();

    return Array.from(this.retryContexts.values()).filter(
      (context) =>
        context.status === 'retrying' &&
        context.nextRetryAt &&
        context.nextRetryAt <= now,
    );
  }

  /**
   * Obtém context de retry por ID
   * @param notificationId ID da notificação
   * @returns Context ou null se não encontrado
   */
  getRetryContext(notificationId: string): RetryContext | null {
    return this.retryContexts.get(notificationId) ?? null;
  }

  /**
   * Lista todos os contexts de retry ativos
   * @returns Array com todos os contexts
   */
  getAllRetryContexts(): RetryContext[] {
    return Array.from(this.retryContexts.values());
  }

  /**
   * Remove context de retry (para limpeza manual)
   * @param notificationId ID da notificação
   * @returns true se removido com sucesso
   */
  removeRetryContext(notificationId: string): boolean {
    return this.retryContexts.delete(notificationId);
  }

  /**
   * Limpa contexts antigos baseado em critérios
   * @param olderThanHours Limpar contexts mais antigos que X horas
   * @returns Número de contexts removidos
   */
  cleanupOldContexts(olderThanHours = 24): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, context] of this.retryContexts.entries()) {
      if (
        (context.status === 'failed' || context.status === 'success') &&
        context.createdAt < cutoff
      ) {
        this.retryContexts.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.log('Cleanup de contexts antigos', {
        removed,
        olderThanHours,
      });
    }

    return removed;
  }

  /**
   * Verifica se deve tentar retry novamente
   * @param context Context da notificação
   * @returns true se deve tentar novamente
   */
  private shouldRetry(context: RetryContext): boolean {
    return context.attempts.length < this.retryConfig.maxAttempts;
  }

  /**
   * Calcula data da próxima tentativa usando backoff exponencial
   * @param attemptNumber Número da tentativa (baseado em 1)
   * @returns Data da próxima tentativa
   */
  private calculateNextRetry(attemptNumber: number): Date {
    const delay = Math.min(
      this.retryConfig.initialDelayMs *
        Math.pow(this.retryConfig.backoffMultiplier, attemptNumber - 1),
      this.retryConfig.maxDelayMs,
    );

    return new Date(Date.now() + delay);
  }

  /**
   * Carrega configuração de retry do ambiente
   * @returns Configuração de retry
   */
  private loadRetryConfig(): RetryConfig {
    return {
      maxAttempts: this.configService.get<number>(
        'NOTIFICATION_MAX_RETRY_ATTEMPTS',
        DEFAULT_RETRY_CONFIG.maxAttempts,
      ),
      initialDelayMs: this.configService.get<number>(
        'NOTIFICATION_INITIAL_RETRY_DELAY',
        DEFAULT_RETRY_CONFIG.initialDelayMs,
      ),
      maxDelayMs: this.configService.get<number>(
        'NOTIFICATION_MAX_RETRY_DELAY',
        DEFAULT_RETRY_CONFIG.maxDelayMs,
      ),
      backoffMultiplier: this.configService.get<number>(
        'NOTIFICATION_RETRY_BACKOFF_MULTIPLIER',
        DEFAULT_RETRY_CONFIG.backoffMultiplier,
      ),
    };
  }
}
