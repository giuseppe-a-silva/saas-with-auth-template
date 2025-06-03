import { PrismaService } from '../../database/prisma.service';
import { AuditConfig } from '../config/audit.config';
export declare class AuditCleanupService {
    private readonly prismaService;
    private readonly auditConfig;
    private readonly logger;
    constructor(prismaService: PrismaService, auditConfig: AuditConfig);
    clearAllAuditData(): Promise<{
        deletedCount: number;
    }>;
    cleanupExpiredData(): Promise<{
        deletedCount: number;
    }>;
    getAuditDataStats(): Promise<{
        totalRecords: number;
        expiredRecords: number;
        oldestRecord: Date | null;
        newestRecord: Date | null;
    }>;
}
