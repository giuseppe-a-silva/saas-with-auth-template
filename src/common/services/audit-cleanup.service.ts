import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditConfig } from '../config/audit.config';

/**
 * Serviço responsável pela limpeza de dados antigos de auditoria
 * Separado do AuditService para manter responsabilidades específicas (MVP otimizado)
 */
@Injectable()
export class AuditCleanupService {
  private readonly logger = new Logger(AuditCleanupService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditConfig: AuditConfig,
  ) {}

  /**
   * Remove todos os dados de auditoria existentes (para MVP clean start)
   * @returns Número de registros removidos
   */
  async clearAllAuditData(): Promise<{ deletedCount: number }> {
    this.logger.warn('Iniciando limpeza completa dos dados de auditoria...');

    try {
      const result = await this.prismaService.auditLog.deleteMany({});

      this.logger.log(`Limpeza concluída: ${result.count} registros removidos`);

      return { deletedCount: result.count };
    } catch (error) {
      this.logger.error('Erro durante limpeza completa:', error);
      throw error;
    }
  }

  /**
   * Remove apenas dados de auditoria expirados baseado nas políticas de retenção
   * @returns Número de registros removidos
   */
  async cleanupExpiredData(): Promise<{ deletedCount: number }> {
    this.logger.debug('Iniciando limpeza de dados expirados...');

    try {
      const result = await this.prismaService.auditLog.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.debug(`Dados expirados removidos: ${result.count}`);

      return { deletedCount: result.count };
    } catch (error) {
      this.logger.error('Erro durante limpeza de dados expirados:', error);
      throw error;
    }
  }

  /**
   * Retorna estatísticas básicas dos dados de auditoria
   * @returns Contadores de registros
   */
  async getAuditDataStats(): Promise<{
    totalRecords: number;
    expiredRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    try {
      const [totalRecords, expiredRecords, oldestRecord, newestRecord] =
        await Promise.all([
          this.prismaService.auditLog.count(),
          this.prismaService.auditLog.count({
            where: {
              expiresAt: {
                lt: new Date(),
              },
            },
          }),
          this.prismaService.auditLog.findFirst({
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          }),
          this.prismaService.auditLog.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ]);

      return {
        totalRecords,
        expiredRecords,
        oldestRecord: oldestRecord?.createdAt ?? null,
        newestRecord: newestRecord?.createdAt ?? null,
      };
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}
