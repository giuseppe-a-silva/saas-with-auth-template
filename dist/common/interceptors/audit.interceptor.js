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
var AuditInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = exports.Audit = exports.AUDIT_METADATA_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const operators_1 = require("rxjs/operators");
const feature_flags_config_1 = require("../config/feature-flags.config");
const audit_service_1 = require("../services/audit.service");
exports.AUDIT_METADATA_KEY = 'audit_metadata';
const Audit = (action, options) => (0, common_1.SetMetadata)(exports.AUDIT_METADATA_KEY, { action, options });
exports.Audit = Audit;
let AuditInterceptor = AuditInterceptor_1 = class AuditInterceptor {
    auditService;
    featureFlags;
    reflector;
    logger = new common_1.Logger(AuditInterceptor_1.name);
    constructor(auditService, featureFlags, reflector) {
        this.auditService = auditService;
        this.featureFlags = featureFlags;
        this.reflector = reflector;
    }
    intercept(context, next) {
        if (!this.featureFlags.enableAuditSystem) {
            return next.handle();
        }
        const auditMetadata = this.reflector.getAllAndOverride(exports.AUDIT_METADATA_KEY, [context.getHandler(), context.getClass()]);
        if (!auditMetadata) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();
        const auditContext = this.extractRequestInfo(request, auditMetadata);
        return next.handle().pipe((0, operators_1.tap)((responseData) => {
            this.createSuccessAuditLog(auditMetadata, auditContext, response, responseData, startTime);
        }), (0, operators_1.catchError)((error) => {
            this.createErrorAuditLog(auditMetadata, auditContext, response, error, startTime);
            throw error;
        }));
    }
    extractRequestInfo(request, auditMetadata) {
        const requestWithUser = request;
        const user = requestWithUser.user;
        const userAgent = request.get('User-Agent') ?? 'Unknown';
        const ipAddress = this.extractIpAddress(request);
        let requestData;
        if (auditMetadata.options?.includeRequestBody) {
            const sensitiveFields = auditMetadata.options?.sensitiveFields;
            requestData = {
                body: this.sanitizeRequestData(request.body, sensitiveFields),
                query: request.query,
                params: request.params,
            };
        }
        return {
            userId: user?.id ?? user?.sub,
            action: auditMetadata.action,
            ipAddress,
            userAgent,
            endpoint: request.path,
            method: request.method,
            requestData,
            resource: this.extractResourceName(request.path),
            resourceId: this.extractResourceId(request.params),
        };
    }
    extractIpAddress(request) {
        return ((request.get('x-forwarded-for') ?? '').split(',').shift() ??
            request.get('x-real-ip') ??
            request.socket.remoteAddress ??
            'unknown');
    }
    sanitizeRequestData(data, sensitiveFields = ['password', 'currentPassword', 'newPassword']) {
        if (!data || typeof data !== 'object') {
            return {};
        }
        const sanitized = { ...data };
        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
    extractResourceName(path) {
        const segments = path.split('/').filter(Boolean);
        return segments[0] || 'unknown';
    }
    extractResourceId(params) {
        return params.id || params.userId || params.resourceId;
    }
    createSuccessAuditLog(auditMetadata, auditContext, response, responseData, startTime) {
        const responseTime = Date.now() - startTime;
        let sanitizedResponseData;
        if (auditMetadata.options?.includeResponseBody && responseData) {
            sanitizedResponseData = this.sanitizeResponseData(responseData);
        }
        const auditLog = {
            ...auditContext,
            action: auditMetadata.action,
            statusCode: response.statusCode,
            responseData: sanitizedResponseData,
            metadata: {
                responseTime,
                success: true,
            },
        };
        setImmediate(() => {
            this.auditService.createAuditLog(auditLog).catch((error) => {
                this.logger.error('Erro ao criar log de auditoria de sucesso:', error);
            });
        });
    }
    createErrorAuditLog(auditMetadata, auditContext, response, error, startTime) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const auditLog = {
            ...auditContext,
            action: auditMetadata.action,
            statusCode: response.statusCode || 500,
            responseData: {
                error: errorMessage,
                success: false,
            },
            metadata: {
                responseTime,
                success: false,
                errorDetails: errorMessage,
            },
        };
        setImmediate(() => {
            this.auditService.createAuditLog(auditLog).catch((auditError) => {
                this.logger.error('Erro ao criar log de auditoria de erro:', auditError);
            });
        });
    }
    sanitizeResponseData(responseData) {
        if (!responseData || typeof responseData !== 'object') {
            return { type: typeof responseData };
        }
        const sanitized = { ...responseData };
        const sensitiveFields = ['password', 'token', 'secret', 'key'];
        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = AuditInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService,
        feature_flags_config_1.FeatureFlagsConfig,
        core_1.Reflector])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map