import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
import { AuditActionType, AuditConfig } from '../config/audit.config';
import { FeatureFlagsConfig } from '../config/feature-flags.config';
import {
  AuditCleanupResult,
  AuditStats,
  CreateAuditLogInput,
  SimpleAuditLog,
} from '../types/audit.types';

/**
 * Serviço responsável pelo sistema de auditoria
 * Gerencia logs estruturados no banco e logs simples em arquivos
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly logBuffer: SimpleAuditLog[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditConfig: AuditConfig,
    private readonly featureFlags: FeatureFlagsConfig,
    private readonly configService: ConfigService,
  ) {
    // Inicia timer de flush automático se configurado
    this.initializeFlushTimer();
  }

  /**
   * Cria um log de auditoria completo (banco + arquivo)
   * Sistema híbrido otimizado para MVP
   * @param input - Dados do log de auditoria
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    if (!this.featureFlags.enableAuditSystem) {
      return;
    }

    try {
      // Calcula data de expiração baseada na política de retenção
      const expiresAt = this.calculateExpirationDate(input.action);
      const auditData = { ...input, expiresAt };

      // Sistema híbrido: sempre salva no banco E arquivo para MVP
      await Promise.all([
        this.createStructuredLog(auditData),
        this.createFileLog(auditData),
      ]);

      // Envia para analytics se configurado
      if (this.auditConfig.analyticsConfig.enabled) {
        this.sendToAnalytics(auditData);
      }
    } catch (error) {
      this.logger.error('Erro ao criar log de auditoria:', error);
      // Não propaga o erro para não afetar a operação principal
    }
  }

  /**
   * Cria log estruturado no banco de dados
   * @param input - Dados do log de auditoria
   * @private
   */
  private async createStructuredLog(input: CreateAuditLogInput): Promise<void> {
    try {
      // Type assertion para resolver problemas de inferência do TypeScript
      const prisma = this.prismaService;

      await prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          endpoint: input.endpoint,
          method: input.method,
          statusCode: input.statusCode,
          requestData: input.requestData as Prisma.InputJsonValue,
          responseData: input.responseData as Prisma.InputJsonValue,
          metadata: input.metadata as Prisma.InputJsonValue,
          expiresAt: input.expiresAt,
        },
      });

      this.logger.debug(`Log estruturado criado para ação: ${input.action}`);
    } catch (error) {
      this.logger.error('Erro ao salvar log estruturado:', error);
      throw error;
    }
  }

  /**
   * Cria log simples em arquivo
   * @param input - Dados do log de auditoria
   * @private
   */
  private async createFileLog(input: CreateAuditLogInput): Promise<void> {
    if (!this.auditConfig.fileLogConfig.enabled) {
      return;
    }

    const simpleLog: SimpleAuditLog = {
      timestamp: new Date().toISOString(),
      action: input.action,
      userId: input.userId,
      ipAddress: input.ipAddress,
      endpoint: input.endpoint,
      success: (input.statusCode ?? 200) < 400,
      message: this.buildLogMessage(input),
    };

    // Adiciona ao buffer para flush em lote
    this.logBuffer.push(simpleLog);

    // Flush imediato se buffer está cheio
    if (
      this.logBuffer.length >= this.auditConfig.performanceConfig.bufferSize
    ) {
      await this.flushLogBuffer();
    }
  }

  /**
   * Constrói mensagem legível do log
   * @param input - Dados do log
   * @returns Mensagem formatada
   * @private
   */
  private buildLogMessage(input: CreateAuditLogInput): string {
    const parts: string[] = [];

    if (input.userId) {
      parts.push(`Usuário: ${input.userId}`);
    }

    if (input.endpoint) {
      parts.push(`Endpoint: ${input.method ?? 'Unknown'} ${input.endpoint}`);
    }

    if (input.statusCode) {
      parts.push(`Status: ${input.statusCode}`);
    }

    if (input.ipAddress) {
      parts.push(`IP: ${input.ipAddress}`);
    }

    return parts.join(' | ');
  }

  /**
   * Faz flush do buffer de logs para arquivo
   * @private
   */
  private async flushLogBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    try {
      const logPath = this.auditConfig.fileLogConfig.path;
      await this.ensureLogDirectory(logPath);

      const logEntries =
        this.logBuffer.map((log) => JSON.stringify(log)).join('\n') + '\n';

      await fs.appendFile(logPath, logEntries, 'utf8');

      this.logger.debug(`${this.logBuffer.length} logs gravados em arquivo`);
      this.logBuffer.length = 0; // Limpa o buffer
    } catch (error) {
      this.logger.error('Erro ao gravar logs em arquivo:', error);
    }
  }

  /**
   * Garante que o diretório de logs existe
   * @param logPath - Caminho do arquivo de log
   * @private
   */
  private async ensureLogDirectory(logPath: string): Promise<void> {
    try {
      const logDir = path.dirname(logPath);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      this.logger.error('Erro ao criar diretório de logs:', error);
    }
  }

  /**
   * Envia dados para sistema de analytics
   * @param input - Dados do log
   * @private
   */
  private sendToAnalytics(input: CreateAuditLogInput): void {
    try {
      const analyticsData = {
        timestamp: new Date().toISOString(),
        action: input.action,
        userId: input.userId,
        success: (input.statusCode ?? 200) < 400,
        duration: input.metadata?.responseTime,
        endpoint: input.endpoint,
      };

      // Aqui seria implementada a integração com o sistema de analytics
      // Por exemplo: envio para Google Analytics, Mixpanel, etc.
      this.logger.debug('Dados enviados para analytics:', analyticsData);
    } catch (error) {
      this.logger.error('Erro ao enviar para analytics:', error);
    }
  }

  /**
   * Calcula data de expiração baseada na política de retenção
   * @param action - Tipo de ação
   * @returns Data de expiração
   * @private
   */
  private calculateExpirationDate(action: AuditActionType): Date {
    const retentionDays = this.auditConfig.retentionPolicyDays[action];
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + retentionDays);
    return expirationDate;
  }

  /**
   * Inicializa timer de flush automático
   * @private
   */
  private initializeFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    const flushInterval = this.auditConfig.performanceConfig.flushInterval;
    this.flushTimer = setInterval(() => {
      void this.flushLogBuffer();
    }, flushInterval);
  }

  /**
   * Remove logs expirados baseado na política de retenção
   * Funcionalidade simplificada para MVP - deve ser executada manualmente
   * @returns Resultado da limpeza
   */
  async cleanupExpiredLogs(): Promise<AuditCleanupResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalProcessed = 0;
    let deletedCount = 0;

    try {
      // Type assertion para resolver problemas de inferência do TypeScript
      const prisma = this.prismaService;

      // Remove logs expirados em lotes para não sobrecarregar o banco
      const batchSize = 1000; // Valor fixo para MVP
      let hasMore = true;

      while (hasMore) {
        const expiredLogs = await prisma.auditLog.findMany({
          where: {
            expiresAt: {
              lt: new Date(),
            },
          },
          take: batchSize,
          select: { id: true },
        });

        if (expiredLogs.length === 0) {
          hasMore = false;
          break;
        }

        const ids = expiredLogs.map((log) => log.id);
        const deleteResult = await prisma.auditLog.deleteMany({
          where: {
            id: {
              in: ids,
            },
          },
        });

        deletedCount += deleteResult.count;
        totalProcessed += expiredLogs.length;

        this.logger.debug(
          `Lote de cleanup: ${deleteResult.count} logs removidos`,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Cleanup concluído: ${deletedCount} logs removidos em ${duration}ms`,
      );

      return {
        deletedCount,
        errors,
        totalProcessed,
        duration,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(errorMessage);
      this.logger.error('Erro durante cleanup de logs:', error);

      return {
        deletedCount,
        errors,
        totalProcessed,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Retorna estatísticas dos logs de auditoria
   * @returns Estatísticas de auditoria
   */
  async getAuditStats(): Promise<AuditStats> {
    try {
      // Type assertion para resolver problemas de inferência do TypeScript
      const prisma = this.prismaService;

      const totalLogs = await prisma.auditLog.count();

      const logsByAction = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: {
          action: true,
        },
      });

      const oldestLog = await prisma.auditLog.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const newestLog = await prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const actionCounts: Record<AuditActionType, number> = {} as Record<
        AuditActionType,
        number
      >;
      for (const group of logsByAction) {
        actionCounts[group.action] = group._count.action;
      }

      return {
        totalLogs,
        logsByAction: actionCounts,
        oldestLog: oldestLog?.createdAt,
        newestLog: newestLog?.createdAt,
      };
    } catch (error) {
      this.logger.error('Erro ao buscar estatísticas de auditoria:', error);
      throw error;
    }
  }

  /**
   * Cleanup na destruição do serviço
   */
  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushLogBuffer();
  }
}
