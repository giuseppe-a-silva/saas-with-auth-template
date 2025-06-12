import { Injectable, Logger } from '@nestjs/common';

/**
 * Interface para métricas de performance de uma operação
 */
interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Interface para estatísticas agregadas de performance
 */
interface PerformanceStats {
  operation: string;
  count: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalDuration: number;
}

/**
 * Serviço para coleta e monitoramento de métricas de performance
 * Implementa coleta em memória com buffer circular para otimização
 */
@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);
  private readonly metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Buffer circular de 1000 métricas
  private writeIndex = 0;

  /**
   * Registra uma métrica de performance
   * @param operation - Nome da operação
   * @param duration - Duração em milissegundos
   * @param metadata - Metadados adicionais (opcional)
   */
  recordMetric(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>,
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    // Buffer circular - substitui a entrada mais antiga
    this.metrics[this.writeIndex] = metric;
    this.writeIndex = (this.writeIndex + 1) % this.MAX_METRICS;

    // Log operações lentas
    if (duration > 1000) {
      this.logger.warn('Slow operation detected', {
        operation,
        duration: `${duration}ms`,
        metadata,
      });
    }
  }

  /**
   * Cria um timer para medir automaticamente a duração de uma operação
   * @param operation - Nome da operação
   * @param metadata - Metadados adicionais (opcional)
   * @returns Função para finalizar o timer
   */
  startTimer(
    operation: string,
    metadata?: Record<string, unknown>,
  ): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration, metadata);
    };
  }

  /**
   * Obtém estatísticas de performance por operação
   * @param operation - Nome da operação específica (opcional)
   * @param lastMinutes - Considerar apenas métricas dos últimos N minutos (opcional)
   * @returns Estatísticas de performance
   */
  getStats(operation?: string, lastMinutes?: number): PerformanceStats[] {
    const now = Date.now();
    const timeFilter = lastMinutes ? now - lastMinutes * 60 * 1000 : 0;

    // Filtrar métricas válidas e dentro do período
    const validMetrics = this.metrics.filter(
      (metric) =>
        metric &&
        (!operation || metric.operation === operation) &&
        metric.timestamp >= timeFilter,
    );

    // Agrupar por operação
    const grouped = validMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.operation]) {
          acc[metric.operation] = [];
        }
        acc[metric.operation].push(metric.duration);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    // Calcular estatísticas
    return Object.entries(grouped).map(([op, durations]) => ({
      operation: op,
      count: durations.length,
      averageDuration:
        durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
    }));
  }

  /**
   * Obtém as operações mais lentas
   * @param limit - Número máximo de operações a retornar
   * @param lastMinutes - Considerar apenas métricas dos últimos N minutos (opcional)
   * @returns Lista das operações mais lentas
   */
  getSlowestOperations(
    limit: number = 10,
    lastMinutes?: number,
  ): Array<{ operation: string; duration: number; timestamp: number }> {
    const now = Date.now();
    const timeFilter = lastMinutes ? now - lastMinutes * 60 * 1000 : 0;

    return this.metrics
      .filter((metric) => metric && metric.timestamp >= timeFilter)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map((metric) => ({
        operation: metric.operation,
        duration: metric.duration,
        timestamp: metric.timestamp,
      }));
  }

  /**
   * Obtém informações sobre o buffer de métricas
   * @returns Informações do buffer
   */
  getBufferInfo(): {
    size: number;
    maxSize: number;
    usage: number;
    oldestMetric?: { timestamp: number; operation: string };
  } {
    const validMetrics = this.metrics.filter((metric) => metric);
    const oldest = validMetrics.reduce(
      (oldest, current) =>
        !oldest || current.timestamp < oldest.timestamp ? current : oldest,
      null as PerformanceMetric | null,
    );

    return {
      size: validMetrics.length,
      maxSize: this.MAX_METRICS,
      usage: (validMetrics.length / this.MAX_METRICS) * 100,
      oldestMetric: oldest
        ? {
            timestamp: oldest.timestamp,
            operation: oldest.operation,
          }
        : undefined,
    };
  }

  /**
   * Limpa todas as métricas armazenadas
   */
  clearMetrics(): void {
    this.metrics.length = 0;
    this.writeIndex = 0;
    this.logger.log('Performance metrics cleared');
  }

  /**
   * Obtém um relatório resumido de performance
   * @param lastMinutes - Considerar apenas métricas dos últimos N minutos
   * @returns Relatório de performance
   */
  getPerformanceReport(lastMinutes: number = 60): {
    summary: {
      totalOperations: number;
      averageDuration: number;
      slowOperations: number;
    };
    topOperations: PerformanceStats[];
    slowestOperations: Array<{
      operation: string;
      duration: number;
      timestamp: number;
    }>;
    bufferInfo: {
      size: number;
      maxSize: number;
      usage: number;
    };
  } {
    const stats = this.getStats(undefined, lastMinutes);
    const slowestOps = this.getSlowestOperations(5, lastMinutes);
    const bufferInfo = this.getBufferInfo();

    const totalOperations = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalDuration = stats.reduce(
      (sum, stat) => sum + stat.totalDuration,
      0,
    );
    const slowOperations = stats.reduce(
      (count, stat) => count + (stat.averageDuration > 1000 ? 1 : 0),
      0,
    );

    return {
      summary: {
        totalOperations,
        averageDuration:
          totalOperations > 0 ? totalDuration / totalOperations : 0,
        slowOperations,
      },
      topOperations: stats.sort((a, b) => b.count - a.count).slice(0, 10),
      slowestOperations: slowestOps,
      bufferInfo: {
        size: bufferInfo.size,
        maxSize: bufferInfo.maxSize,
        usage: bufferInfo.usage,
      },
    };
  }
}
