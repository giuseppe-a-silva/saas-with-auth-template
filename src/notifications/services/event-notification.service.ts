import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  EventNotificationPayload,
  EventNotificationResult,
} from '../interfaces/event-notification.interface';

/**
 * Service principal para notificações baseadas em eventos
 * Nova API simplificada: sendNotification(eventKey, payload)
 */
@Injectable()
export class EventNotificationService implements OnModuleInit {
  private readonly logger = new Logger(EventNotificationService.name);
  private notificationQueue!: Queue;
  private redisConnection!: IORedis;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Inicializa a conexão Redis e a fila BullMQ
   */
  onModuleInit(): void {
    try {
      // Configuração Redis
      this.redisConnection = new IORedis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        maxRetriesPerRequest: null,
      });

      // Configuração da fila
      this.notificationQueue = new Queue('notifications', {
        connection: this.redisConnection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });

      this.logger.log('BullMQ e Redis inicializados com sucesso');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao inicializar BullMQ', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Envia notificação baseada em evento
   * @param eventKey Chave do evento (ex: USER_REGISTERED, LOGIN)
   * @param payload Dados do evento
   * @returns Resultado com ID do job
   */
  async sendNotification(
    eventKey: string,
    payload: EventNotificationPayload,
  ): Promise<EventNotificationResult> {
    try {
      this.logger.log('Iniciando processamento de evento', {
        eventKey,
        recipientEmail: payload.recipient.email,
        timestamp: payload.timestamp,
      });

      // Validação básica
      this.validatePayload(eventKey, payload);

      // Adiciona job na fila do BullMQ
      const job = await this.notificationQueue.add(
        'process-event-notification',
        {
          eventKey,
          payload,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      this.logger.log('Job de notificação enfileirado', {
        eventKey,
        jobId: job.id,
        recipientEmail: payload.recipient.email,
      });

      return {
        eventKey,
        totalChannels: 0, // Será atualizado pelo processor
        successCount: 0,
        failureCount: 0,
        channelResults: [],
        jobId: job.id!.toString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error('Erro ao processar evento de notificação', {
        eventKey,
        error: errorMessage,
        recipientEmail: payload.recipient.email,
      });

      throw new Error(`Falha ao processar evento ${eventKey}: ${errorMessage}`);
    }
  }

  /**
   * Valida o payload de entrada
   * @param eventKey Chave do evento
   * @param payload Dados do payload
   */
  private validatePayload(
    eventKey: string,
    payload: EventNotificationPayload,
  ): void {
    if (!eventKey || eventKey.trim().length === 0) {
      throw new Error('EventKey é obrigatório');
    }

    if (!payload.timestamp) {
      throw new Error('Timestamp é obrigatório');
    }

    if (!payload.recipient) {
      throw new Error('Recipient é obrigatório');
    }

    if (!payload.recipient.email) {
      throw new Error('Email do recipient é obrigatório');
    }

    if (!payload.recipient.id) {
      throw new Error('ID do recipient é obrigatório');
    }

    if (!payload.recipient.name) {
      throw new Error('Nome do recipient é obrigatório');
    }

    if (!payload.data || typeof payload.data !== 'object') {
      throw new Error('Data deve ser um objeto válido');
    }
  }

  /**
   * Obtém estatísticas da fila de notificações
   * @returns Estatísticas da fila
   */
  async getQueueStatistics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    if (!this.notificationQueue) {
      throw new Error('Fila não inicializada');
    }

    const waiting = await this.notificationQueue.getWaiting();
    const active = await this.notificationQueue.getActive();
    const completed = await this.notificationQueue.getCompleted();
    const failed = await this.notificationQueue.getFailed();
    const delayed = await this.notificationQueue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  /**
   * Limpa jobs antigos da fila
   * @param grace Período de graça em milissegundos
   * @returns Número de jobs removidos
   */
  async cleanQueue(grace = 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.notificationQueue) {
      throw new Error('Fila não inicializada');
    }

    const completed = await this.notificationQueue.clean(
      grace,
      100,
      'completed',
    );
    const failed = await this.notificationQueue.clean(grace, 50, 'failed');

    this.logger.log('Limpeza da fila executada', {
      completedRemoved: completed.length,
      failedRemoved: failed.length,
    });

    return completed.length + failed.length;
  }
}
