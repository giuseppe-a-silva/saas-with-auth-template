"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuditCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditCleanupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const audit_config_1 = require("../config/audit.config");
let AuditCleanupService = AuditCleanupService_1 = class AuditCleanupService {
    prismaService;
    auditConfig;
    logger = new common_1.Logger(AuditCleanupService_1.name);
    constructor(prismaService, auditConfig) {
        this.prismaService = prismaService;
        this.auditConfig = auditConfig;
    }
    async clearAllAuditData() {
        this.logger.warn('Iniciando limpeza completa dos dados de auditoria...');
        try {
            const result = await this.prismaService.auditLog.deleteMany({});
            this.logger.log(`Limpeza concluída: ${result.count} registros removidos`);
            return { deletedCount: result.count };
        }
        catch (error) {
            this.logger.error('Erro durante limpeza completa:', error);
            throw error;
        }
    }
    async cleanupExpiredData() {
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
        }
        catch (error) {
            this.logger.error('Erro durante limpeza de dados expirados:', error);
            throw error;
        }
    }
    async getAuditDataStats() {
        try {
            const [totalRecords, expiredRecords, oldestRecord, newestRecord] = await Promise.all([
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
        }
        catch (error) {
            this.logger.error('Erro ao obter estatísticas:', error);
            throw error;
        }
    }
};
exports.AuditCleanupService = AuditCleanupService;
exports.AuditCleanupService = AuditCleanupService = AuditCleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_config_1.AuditConfig])
], AuditCleanupService);
//# sourceMappingURL=audit-cleanup.service.js.map