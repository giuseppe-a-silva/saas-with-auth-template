import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Interface para eventos de query do Prisma
 */
interface QueryEvent {
  query: string;
  params: string;
  duration: number;
  target: string;
}

/**
 * Serviço de banco de dados usando Prisma ORM
 * Implementa connection pooling e otimizações de performance
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Configurações de conexão otimizadas
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Log de queries lentas em desenvolvimento
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { level: 'query', emit: 'event' },
              { level: 'error', emit: 'stdout' },
              { level: 'warn', emit: 'stdout' },
            ]
          : [
              { level: 'error', emit: 'stdout' },
              { level: 'warn', emit: 'stdout' },
            ],
    });

    // Log de queries lentas apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: QueryEvent) => {
        if (e.duration > 1000) {
          // Log queries que demoram mais de 1 segundo
          this.logger.warn(`Slow query detected`, {
            query: e.query.substring(0, 200),
            params: e.params,
            duration: `${e.duration}ms`,
          });
        }
      });
    }
  }

  /**
   * Inicialização do módulo - conecta ao banco
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');

      // Log das configurações de connection pool (apenas em desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug('Prisma connection pool configured', {
          connectionLimit: process.env.DATABASE_CONNECTION_LIMIT ?? 'default',
          poolTimeout: process.env.DATABASE_POOL_TIMEOUT ?? 'default',
        });
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Destruição do módulo - desconecta do banco
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Executa uma transação com retry automático
   * @param fn - Função a ser executada dentro da transação
   * @param maxRetries - Número máximo de tentativas
   * @returns Resultado da transação
   */
  async executeTransaction<T>(
    fn: (
      prisma: Omit<
        PrismaClient,
        | '$on'
        | '$connect'
        | '$disconnect'
        | '$use'
        | '$transaction'
        | '$extends'
      >,
    ) => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const result = await this.$transaction(fn, {
          maxWait: 5000, // 5 segundos
          timeout: 10000, // 10 segundos
        });
        return result as T;
      } catch (error) {
        attempt++;
        this.logger.warn(`Transaction attempt ${attempt} failed`, {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          maxRetries,
        });

        if (attempt >= maxRetries) {
          this.logger.error('Transaction failed after all retries', {
            error: error instanceof Error ? error.message : String(error),
            totalAttempts: attempt,
          });
          throw error;
        }

        // Delay exponencial entre tentativas
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }
    throw new Error('Unexpected transaction failure');
  }

  /**
   * Verifica a saúde da conexão com o banco
   * @returns Status da conexão
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      this.logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Obtém estatísticas de performance do banco
   * @returns Estatísticas do banco de dados
   */
  async getPerformanceStats(): Promise<{
    connectionCount?: number;
    activeConnections?: number;
    poolSize?: number;
  }> {
    try {
      // Query para estatísticas do PostgreSQL
      const stats = await this.$queryRaw<
        Array<{ stat_name: string; value: string }>
      >`
        SELECT 
          'total_connections' as stat_name, 
          (SELECT count(*) FROM pg_stat_activity)::text as value
        UNION ALL
        SELECT 
          'active_connections' as stat_name,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')::text as value
        UNION ALL
        SELECT 
          'max_connections' as stat_name,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections')::text as value
      `;

      const result: Record<string, number> = {};
      stats.forEach((row) => {
        result[row.stat_name] = parseInt(row.value);
      });

      return {
        connectionCount: result.total_connections,
        activeConnections: result.active_connections,
        poolSize: result.max_connections,
      };
    } catch (error) {
      this.logger.warn('Failed to get performance stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }
}
