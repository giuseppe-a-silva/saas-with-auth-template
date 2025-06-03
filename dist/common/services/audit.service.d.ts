import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuditConfig } from '../config/audit.config';
import { FeatureFlagsConfig } from '../config/feature-flags.config';
import { AuditCleanupResult, AuditStats, CreateAuditLogInput } from '../types/audit.types';
export declare class AuditService {
    private readonly prismaService;
    private readonly auditConfig;
    private readonly featureFlags;
    private readonly configService;
    private readonly logger;
    private readonly logBuffer;
    private flushTimer?;
    constructor(prismaService: PrismaService, auditConfig: AuditConfig, featureFlags: FeatureFlagsConfig, configService: ConfigService);
    createAuditLog(input: CreateAuditLogInput): Promise<void>;
    private createStructuredLog;
    private createFileLog;
    private buildLogMessage;
    private flushLogBuffer;
    private ensureLogDirectory;
    private sendToAnalytics;
    private calculateExpirationDate;
    private initializeFlushTimer;
    cleanupExpiredLogs(): Promise<AuditCleanupResult>;
    getAuditStats(): Promise<AuditStats>;
    onModuleDestroy(): Promise<void>;
}
