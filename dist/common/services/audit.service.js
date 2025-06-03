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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs/promises");
const path = require("path");
const prisma_service_1 = require("../../database/prisma.service");
const audit_config_1 = require("../config/audit.config");
const feature_flags_config_1 = require("../config/feature-flags.config");
let AuditService = AuditService_1 = class AuditService {
    prismaService;
    auditConfig;
    featureFlags;
    configService;
    logger = new common_1.Logger(AuditService_1.name);
    logBuffer = [];
    flushTimer;
    constructor(prismaService, auditConfig, featureFlags, configService) {
        this.prismaService = prismaService;
        this.auditConfig = auditConfig;
        this.featureFlags = featureFlags;
        this.configService = configService;
        this.initializeFlushTimer();
    }
    async createAuditLog(input) {
        if (!this.featureFlags.enableAuditSystem) {
            return;
        }
        try {
            const expiresAt = this.calculateExpirationDate(input.action);
            const auditData = { ...input, expiresAt };
            await Promise.all([
                this.createStructuredLog(auditData),
                this.createFileLog(auditData),
            ]);
            if (this.auditConfig.analyticsConfig.enabled) {
                this.sendToAnalytics(auditData);
            }
        }
        catch (error) {
            this.logger.error('Erro ao criar log de auditoria:', error);
        }
    }
    async createStructuredLog(input) {
        try {
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
                    requestData: input.requestData,
                    responseData: input.responseData,
                    metadata: input.metadata,
                    expiresAt: input.expiresAt,
                },
            });
            this.logger.debug(`Log estruturado criado para ação: ${input.action}`);
        }
        catch (error) {
            this.logger.error('Erro ao salvar log estruturado:', error);
            throw error;
        }
    }
    async createFileLog(input) {
        if (!this.auditConfig.fileLogConfig.enabled) {
            return;
        }
        const simpleLog = {
            timestamp: new Date().toISOString(),
            action: input.action,
            userId: input.userId,
            ipAddress: input.ipAddress,
            endpoint: input.endpoint,
            success: (input.statusCode ?? 200) < 400,
            message: this.buildLogMessage(input),
        };
        this.logBuffer.push(simpleLog);
        if (this.logBuffer.length >= this.auditConfig.performanceConfig.bufferSize) {
            await this.flushLogBuffer();
        }
    }
    buildLogMessage(input) {
        const parts = [];
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
    async flushLogBuffer() {
        if (this.logBuffer.length === 0) {
            return;
        }
        try {
            const logPath = this.auditConfig.fileLogConfig.path;
            await this.ensureLogDirectory(logPath);
            const logEntries = this.logBuffer.map((log) => JSON.stringify(log)).join('\n') + '\n';
            await fs.appendFile(logPath, logEntries, 'utf8');
            this.logger.debug(`${this.logBuffer.length} logs gravados em arquivo`);
            this.logBuffer.length = 0;
        }
        catch (error) {
            this.logger.error('Erro ao gravar logs em arquivo:', error);
        }
    }
    async ensureLogDirectory(logPath) {
        try {
            const logDir = path.dirname(logPath);
            await fs.mkdir(logDir, { recursive: true });
        }
        catch (error) {
            this.logger.error('Erro ao criar diretório de logs:', error);
        }
    }
    sendToAnalytics(input) {
        try {
            const analyticsData = {
                timestamp: new Date().toISOString(),
                action: input.action,
                userId: input.userId,
                success: (input.statusCode ?? 200) < 400,
                duration: input.metadata?.responseTime,
                endpoint: input.endpoint,
            };
            this.logger.debug('Dados enviados para analytics:', analyticsData);
        }
        catch (error) {
            this.logger.error('Erro ao enviar para analytics:', error);
        }
    }
    calculateExpirationDate(action) {
        const retentionDays = this.auditConfig.retentionPolicyDays[action];
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + retentionDays);
        return expirationDate;
    }
    initializeFlushTimer() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        const flushInterval = this.auditConfig.performanceConfig.flushInterval;
        this.flushTimer = setInterval(() => {
            void this.flushLogBuffer();
        }, flushInterval);
    }
    async cleanupExpiredLogs() {
        const startTime = Date.now();
        const errors = [];
        let totalProcessed = 0;
        let deletedCount = 0;
        try {
            const prisma = this.prismaService;
            const batchSize = 1000;
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
                this.logger.debug(`Lote de cleanup: ${deleteResult.count} logs removidos`);
            }
            const duration = Date.now() - startTime;
            this.logger.log(`Cleanup concluído: ${deletedCount} logs removidos em ${duration}ms`);
            return {
                deletedCount,
                errors,
                totalProcessed,
                duration,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
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
    async getAuditStats() {
        try {
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
            const actionCounts = {};
            for (const group of logsByAction) {
                actionCounts[group.action] = group._count.action;
            }
            return {
                totalLogs,
                logsByAction: actionCounts,
                oldestLog: oldestLog?.createdAt,
                newestLog: newestLog?.createdAt,
            };
        }
        catch (error) {
            this.logger.error('Erro ao buscar estatísticas de auditoria:', error);
            throw error;
        }
    }
    async onModuleDestroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        await this.flushLogBuffer();
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_config_1.AuditConfig,
        feature_flags_config_1.FeatureFlagsConfig,
        config_1.ConfigService])
], AuditService);
//# sourceMappingURL=audit.service.js.map