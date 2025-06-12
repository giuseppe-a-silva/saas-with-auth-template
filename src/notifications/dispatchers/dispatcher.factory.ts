import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_MESSAGES } from '../constants/notification.constants';
import {
  NotificationChannel,
  NotificationDispatcher,
} from '../interfaces/notification-dispatcher.interface';
import { EmailDispatcher } from './email.dispatcher';
import { PushDispatcher } from './push.dispatcher';
import { RealtimeDispatcher } from './realtime.dispatcher';

/**
 * Interface para status de canal
 */
interface ChannelStatus {
  channel: NotificationChannel;
  isHealthy: boolean;
  provider?: string;
  timeout?: number;
  isConfigured?: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Factory responsável por gerenciar e fornecer dispatchers
 * Centraliza a lógica de seleção de canal
 */
@Injectable()
export class DispatcherFactory {
  private readonly logger = new Logger(DispatcherFactory.name);
  private readonly dispatchers = new Map<
    NotificationChannel,
    NotificationDispatcher
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly pushDispatcher: PushDispatcher,
    private readonly realtimeDispatcher: RealtimeDispatcher,
  ) {
    this.initializeDispatchers();
  }

  /**
   * Inicializa e registra todos os dispatchers disponíveis
   */
  private initializeDispatchers(): void {
    try {
      // Usa o dispatcher de email que detecta automaticamente SMTP/SES
      this.dispatchers.set(NotificationChannel.EMAIL, this.emailDispatcher);
      this.logger.log('Using email dispatcher (auto-detects SMTP/SES)');

      // Registra outros dispatchers
      this.dispatchers.set(NotificationChannel.PUSH, this.pushDispatcher);
      this.dispatchers.set(
        NotificationChannel.REALTIME,
        this.realtimeDispatcher,
      );

      this.logger.log('Dispatchers inicializados', {
        channels: Array.from(this.dispatchers.keys()),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao inicializar dispatchers', {
        error: errorMessage,
      });
    }
  }

  /**
   * Obtém dispatcher para um canal específico
   * @param channel Canal de notificação
   * @returns Dispatcher correspondente
   * @throws Error se o canal não for suportado
   */
  getDispatcher(channel: NotificationChannel): NotificationDispatcher {
    const dispatcher = this.dispatchers.get(channel);

    if (!dispatcher) {
      throw new Error(`${ERROR_MESSAGES.INVALID_CHANNEL}: ${channel}`);
    }

    return dispatcher;
  }

  /**
   * Verifica se um canal está disponível e configurado
   * @param channel Canal de notificação
   * @returns true se disponível e configurado
   */
  async isChannelAvailable(channel: NotificationChannel): Promise<boolean> {
    try {
      const dispatcher = this.dispatchers.get(channel);

      if (!dispatcher) {
        return false;
      }

      return await dispatcher.isHealthy();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.warn('Erro ao verificar disponibilidade do canal', {
        channel,
        error: errorMessage,
      });
      return false;
    }
  }

  /**
   * Lista todos os canais disponíveis com seus status
   * @returns Mapa de canais e suas configurações
   */
  async getChannelsStatus(): Promise<Record<string, ChannelStatus>> {
    const status: Record<string, ChannelStatus> = {};

    for (const [channel, dispatcher] of this.dispatchers) {
      try {
        const isHealthy = await dispatcher.isHealthy();
        const config = dispatcher.getConfig();

        status[channel] = {
          channel,
          isHealthy,
          ...config,
        } as ChannelStatus;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        status[channel] = {
          channel,
          isHealthy: false,
          error: errorMessage,
        };
      }
    }

    return status;
  }

  /**
   * Lista todos os canais disponíveis
   * @returns Array com canais suportados
   */
  getSupportedChannels(): NotificationChannel[] {
    return Array.from(this.dispatchers.keys());
  }

  /**
   * Verifica se todos os dispatchers estão funcionais
   * @returns true se todos estiverem operacionais
   */
  async areAllChannelsHealthy(): Promise<boolean> {
    try {
      const healthChecks = Array.from(this.dispatchers.values()).map(
        (dispatcher) => dispatcher.isHealthy(),
      );

      const results = await Promise.all(healthChecks);
      return results.every((isHealthy) => isHealthy);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao verificar saúde dos canais', {
        error: errorMessage,
      });
      return false;
    }
  }
}
