import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  NotificationChannel,
  NotificationStatus,
} from '../interfaces/notification-dispatcher.interface';

/**
 * Interface para métricas detalhadas por canal
 */
interface ChannelMetrics {
  total: number;
  sent: number;
  failed: number;
  successRate: number;
  averageResponseTime: number;
  provider: string;
}

/**
 * Interface para relatório de métricas
 */
interface MetricsReport {
  total: number;
  sent: number;
  failed: number;
  successRate: number;
  averageResponseTime: number;
  byChannel: Record<string, ChannelMetrics>;
  byStatus: Record<string, number>;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Interface para métricas em tempo real
 */
interface RealtimeMetrics {
  currentHour: MetricsReport;
  last24Hours: MetricsReport;
  last7Days: MetricsReport;
  generatedAt: Date;
}

/**
 * Interface para definição de métricas customizadas
 */
interface CustomMetric {
  MetricName: string;
  Value: number;
  Unit: 'Count' | 'Milliseconds';
  Dimensions?: Array<{
    Name: string;
    Value: string;
  }>;
}

/**
 * Service responsável por coletar e analisar métricas do sistema de notificações
 */
@Injectable()
export class NotificationMetricsService {
  private readonly logger = new Logger(NotificationMetricsService.name);
  private cloudWatchClient: CloudWatchClient | null = null;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initializeCloudWatch();
  }

  /**
   * Inicializa o cliente CloudWatch se as credenciais estiverem disponíveis
   */
  private initializeCloudWatch(): void {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>(
      'AWS_CLOUDWATCH_REGION',
      'us-east-1',
    );

    if (accessKeyId && secretAccessKey) {
      this.cloudWatchClient = new CloudWatchClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`CloudWatch client initialized for region: ${region}`);
    } else {
      this.logger.warn(
        'CloudWatch não configurado - métricas avançadas indisponíveis',
      );
    }
  }

  /**
   * Obtém métricas de notificação baseadas em logs de auditoria
   */
  async getNotificationMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<MetricsReport> {
    try {
      // Busca logs de auditoria relacionados a notificações
      const auditLogs = await this.prismaService.auditLog.findMany({
        where: {
          action: {
            in: ['NOTIFICATION_SENT', 'NOTIFICATION_FAILED'],
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          action: true,
          metadata: true,
          createdAt: true,
        },
      });

      // Converte os logs de auditoria para o formato esperado
      const notifications = auditLogs.map((log) => ({
        id: log.id,
        status: log.action === 'NOTIFICATION_SENT' ? 'SENT' : 'FAILED',
        channel: this.extractChannelFromMetadata(
          log.metadata as Record<string, unknown> | null,
        ),
        metadata: log.metadata as Record<string, unknown> | null,
        createdAt: log.createdAt,
      }));

      const totalSent = notifications.filter((n) => n.status === 'SENT').length;
      const totalFailed = notifications.filter(
        (n) => n.status === 'FAILED',
      ).length;
      const successRate =
        totalSent + totalFailed > 0
          ? (totalSent / (totalSent + totalFailed)) * 100
          : 0;

      // Calcula tempo médio de resposta
      const responseTimes = notifications
        .filter((n) => n.metadata && typeof n.metadata === 'object')
        .map((n) => {
          const metadata = n.metadata as Record<string, unknown>;
          return typeof metadata.responseTime === 'number'
            ? metadata.responseTime
            : 0;
        })
        .filter((time) => time > 0);

      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) /
            responseTimes.length
          : 0;

      // Métricas por canal
      const byChannel: Record<string, ChannelMetrics> = {};
      const channels = [...new Set(notifications.map((n) => n.channel))];

      for (const channel of channels) {
        const channelNotifications = notifications.filter(
          (n) => n.channel === channel,
        );
        const channelSent = channelNotifications.filter(
          (n) => n.status === 'SENT',
        ).length;
        const channelFailed = channelNotifications.filter(
          (n) => n.status === 'FAILED',
        ).length;
        const channelSuccessRate =
          channelSent + channelFailed > 0
            ? (channelSent / (channelSent + channelFailed)) * 100
            : 0;

        const channelResponseTimes = channelNotifications
          .filter((n) => n.metadata && typeof n.metadata === 'object')
          .map((n) => {
            const metadata = n.metadata as Record<string, unknown>;
            return typeof metadata.responseTime === 'number'
              ? metadata.responseTime
              : 0;
          })
          .filter((time) => time > 0);

        const channelAvgResponseTime =
          channelResponseTimes.length > 0
            ? channelResponseTimes.reduce(
                (sum: number, time: number) => sum + time,
                0,
              ) / channelResponseTimes.length
            : 0;

        // Extrai provider do metadata
        const sampleMetadata = channelNotifications.find((n) => n.metadata)
          ?.metadata as Record<string, unknown>;
        const provider =
          typeof sampleMetadata?.provider === 'string'
            ? sampleMetadata.provider
            : 'unknown';

        byChannel[channel] = {
          total: channelNotifications.length,
          sent: channelSent,
          failed: channelFailed,
          successRate: channelSuccessRate,
          averageResponseTime: channelAvgResponseTime,
          provider,
        };
      }

      // Métricas por status
      const byStatus: Record<string, number> = {};
      const statuses = [...new Set(notifications.map((n) => n.status))];
      for (const status of statuses) {
        byStatus[status] = notifications.filter(
          (n) => n.status === status,
        ).length;
      }

      return {
        total: notifications.length,
        sent: totalSent,
        failed: totalFailed,
        successRate,
        averageResponseTime,
        byChannel,
        byStatus,
        period: {
          start: startDate,
          end: endDate,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao obter métricas de notificação:', error);
      throw error;
    }
  }

  /**
   * Obtém métricas em tempo real (última hora, 24h, 7 dias)
   */
  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const now = new Date();

    // Última hora
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const currentHourMetrics = await this.getNotificationMetrics(
      oneHourAgo,
      now,
    );

    // Últimas 24 horas
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last24HoursMetrics = await this.getNotificationMetrics(
      oneDayAgo,
      now,
    );

    // Últimos 7 dias
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysMetrics = await this.getNotificationMetrics(
      sevenDaysAgo,
      now,
    );

    return {
      currentHour: currentHourMetrics,
      last24Hours: last24HoursMetrics,
      last7Days: last7DaysMetrics,
      generatedAt: now,
    };
  }

  /**
   * Envia métricas personalizadas para o CloudWatch
   */
  async sendCustomMetrics(metrics: CustomMetric[]): Promise<void> {
    if (!this.cloudWatchClient) {
      this.logger.warn('CloudWatch não configurado - métricas não enviadas');
      return;
    }

    try {
      const command = new PutMetricDataCommand({
        Namespace: 'EduMatch/Notifications',
        MetricData: metrics.map((metric) => ({
          ...metric,
          Timestamp: new Date(),
        })),
      });

      await this.cloudWatchClient.send(command);
      this.logger.log(`${metrics.length} métricas enviadas para CloudWatch`);
    } catch (error) {
      this.logger.error('Erro ao enviar métricas para CloudWatch:', error);
      throw error;
    }
  }

  /**
   * Registra métrica de notificação automaticamente
   */
  async recordNotificationMetric(
    channel: NotificationChannel,
    status: NotificationStatus,
    responseTime?: number,
    provider?: string,
  ): Promise<void> {
    const metrics: CustomMetric[] = [
      {
        MetricName: 'NotificationsSent',
        Value: status === NotificationStatus.SENT ? 1 : 0,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Channel', Value: channel },
          { Name: 'Provider', Value: provider ?? 'unknown' },
        ],
      },
      {
        MetricName: 'NotificationsFailed',
        Value: status === NotificationStatus.FAILED ? 1 : 0,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Channel', Value: channel },
          { Name: 'Provider', Value: provider ?? 'unknown' },
        ],
      },
    ];

    if (responseTime && responseTime > 0) {
      metrics.push({
        MetricName: 'NotificationResponseTime',
        Value: responseTime,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'Channel', Value: channel },
          { Name: 'Provider', Value: provider ?? 'unknown' },
        ],
      });
    }

    await this.sendCustomMetrics(metrics);
  }

  /**
   * Gera relatório de métricas em formato texto
   */
  async generateMetricsReport(startDate: Date, endDate: Date): Promise<string> {
    const metrics = await this.getNotificationMetrics(startDate, endDate);

    let report = `📊 RELATÓRIO DE MÉTRICAS DE NOTIFICAÇÕES\n`;
    report += `📅 Período: ${startDate.toLocaleString('pt-BR')} - ${endDate.toLocaleString('pt-BR')}\n\n`;

    report += `📈 RESUMO GERAL\n`;
    report += `   Total de notificações: ${metrics.total}\n`;
    report += `   ✅ Enviadas: ${metrics.sent}\n`;
    report += `   ❌ Falharam: ${metrics.failed}\n`;
    report += `   📊 Taxa de sucesso: ${metrics.successRate.toFixed(2)}%\n`;
    report += `   ⏱️ Tempo médio de resposta: ${metrics.averageResponseTime.toFixed(2)}ms\n\n`;

    report += `📱 MÉTRICAS POR CANAL\n`;
    for (const [channel, channelMetrics] of Object.entries(metrics.byChannel)) {
      report += `   ${channel.toUpperCase()}\n`;
      report += `     📦 Provider: ${channelMetrics.provider}\n`;
      report += `     📊 Total: ${channelMetrics.total}\n`;
      report += `     ✅ Enviadas: ${channelMetrics.sent}\n`;
      report += `     ❌ Falharam: ${channelMetrics.failed}\n`;
      report += `     📈 Taxa de sucesso: ${channelMetrics.successRate.toFixed(2)}%\n`;
      report += `     ⏱️ Tempo médio: ${channelMetrics.averageResponseTime.toFixed(2)}ms\n\n`;
    }

    report += `📋 STATUS DETALHADO\n`;
    for (const [status, count] of Object.entries(metrics.byStatus)) {
      report += `   ${status}: ${count}\n`;
    }

    return report;
  }

  /**
   * Gera dashboard de métricas em tempo real
   */
  async generateRealtimeDashboard(): Promise<Record<string, unknown>> {
    const realtimeMetrics = await this.getRealtimeMetrics();

    return {
      lastUpdate: realtimeMetrics.generatedAt.toISOString(),
      summary: {
        currentHour: {
          total: realtimeMetrics.currentHour.total,
          successRate: Number(
            realtimeMetrics.currentHour.successRate.toFixed(2),
          ),
          averageResponseTime: Number(
            realtimeMetrics.currentHour.averageResponseTime.toFixed(2),
          ),
        },
        last24Hours: {
          total: realtimeMetrics.last24Hours.total,
          successRate: Number(
            realtimeMetrics.last24Hours.successRate.toFixed(2),
          ),
          averageResponseTime: Number(
            realtimeMetrics.last24Hours.averageResponseTime.toFixed(2),
          ),
        },
        last7Days: {
          total: realtimeMetrics.last7Days.total,
          successRate: Number(realtimeMetrics.last7Days.successRate.toFixed(2)),
          averageResponseTime: Number(
            realtimeMetrics.last7Days.averageResponseTime.toFixed(2),
          ),
        },
      },
      channels: {
        currentHour: realtimeMetrics.currentHour.byChannel,
        last24Hours: realtimeMetrics.last24Hours.byChannel,
        last7Days: realtimeMetrics.last7Days.byChannel,
      },
    };
  }

  /**
   * Extrai o canal de notificação dos metadados do log de auditoria
   */
  private extractChannelFromMetadata(
    metadata: Record<string, unknown> | null,
  ): string {
    if (!metadata || typeof metadata !== 'object') {
      return 'unknown';
    }

    // Tenta extrair o canal de diferentes campos possíveis
    const channel =
      (metadata.channel as string) ??
      (metadata.notificationChannel as string) ??
      (metadata.type as string) ??
      'unknown';

    return typeof channel === 'string' ? channel.toLowerCase() : 'unknown';
  }
}
