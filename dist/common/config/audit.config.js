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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditConfig = exports.AuditActionType = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
var AuditActionType;
(function (AuditActionType) {
    AuditActionType["LOGIN"] = "LOGIN";
    AuditActionType["LOGOUT"] = "LOGOUT";
    AuditActionType["LOGIN_FAILED"] = "LOGIN_FAILED";
    AuditActionType["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    AuditActionType["DATA_UPDATE"] = "DATA_UPDATE";
    AuditActionType["ACCESS_DENIED"] = "ACCESS_DENIED";
    AuditActionType["PERMISSION_CHECK"] = "PERMISSION_CHECK";
    AuditActionType["TOKEN_REFRESH"] = "TOKEN_REFRESH";
    AuditActionType["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
})(AuditActionType || (exports.AuditActionType = AuditActionType = {}));
let AuditConfig = class AuditConfig {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    get isEnabled() {
        const env = this.configService.get('NODE_ENV', 'development');
        return this.configService.get('AUDIT_ENABLED', env !== 'test');
    }
    get enableDetailedLogs() {
        const env = this.configService.get('NODE_ENV', 'development');
        return this.configService.get('AUDIT_DETAILED_LOGS', env === 'development');
    }
    get retentionPolicyDays() {
        return {
            [AuditActionType.LOGIN]: this.configService.get('AUDIT_RETENTION_LOGIN', 180),
            [AuditActionType.LOGOUT]: this.configService.get('AUDIT_RETENTION_LOGOUT', 180),
            [AuditActionType.LOGIN_FAILED]: this.configService.get('AUDIT_RETENTION_LOGIN_FAILED', 90),
            [AuditActionType.PASSWORD_CHANGE]: this.configService.get('AUDIT_RETENTION_PASSWORD_CHANGE', 365),
            [AuditActionType.DATA_UPDATE]: this.configService.get('AUDIT_RETENTION_DATA_UPDATE', 365),
            [AuditActionType.ACCESS_DENIED]: this.configService.get('AUDIT_RETENTION_ACCESS_DENIED', 90),
            [AuditActionType.PERMISSION_CHECK]: this.configService.get('AUDIT_RETENTION_PERMISSION_CHECK', 90),
            [AuditActionType.TOKEN_REFRESH]: this.configService.get('AUDIT_RETENTION_TOKEN_REFRESH', 90),
            [AuditActionType.ACCOUNT_LOCKED]: this.configService.get('AUDIT_RETENTION_ACCOUNT_LOCKED', 365),
        };
    }
    get fileLogConfig() {
        const env = this.configService.get('NODE_ENV', 'development');
        return {
            enabled: this.configService.get('AUDIT_FILE_LOGS_ENABLED', true),
            path: this.configService.get('AUDIT_LOG_PATH', `./logs/audit-${env}.log`),
            maxFiles: this.configService.get('AUDIT_LOG_MAX_FILES', 30),
            maxSize: this.configService.get('AUDIT_LOG_MAX_SIZE', '100MB'),
            datePattern: this.configService.get('AUDIT_LOG_DATE_PATTERN', 'YYYY-MM-DD'),
        };
    }
    get analyticsConfig() {
        return {
            enabled: this.configService.get('AUDIT_ANALYTICS_ENABLED', false),
            endpoint: this.configService.get('AUDIT_ANALYTICS_ENDPOINT'),
            apiKey: this.configService.get('AUDIT_ANALYTICS_API_KEY'),
            batchSize: this.configService.get('AUDIT_ANALYTICS_BATCH_SIZE', 100),
            flushInterval: this.configService.get('AUDIT_ANALYTICS_FLUSH_INTERVAL', 30000),
        };
    }
    get performanceConfig() {
        return {
            asyncProcessing: this.configService.get('AUDIT_ASYNC_PROCESSING', true),
            bufferSize: this.configService.get('AUDIT_BUFFER_SIZE', 1000),
            flushInterval: this.configService.get('AUDIT_FLUSH_INTERVAL', 5000),
            maxRetries: this.configService.get('AUDIT_MAX_RETRIES', 3),
        };
    }
    get cleanupConfig() {
        return {
            enabled: this.configService.get('AUDIT_CLEANUP_ENABLED', true),
            schedule: this.configService.get('AUDIT_CLEANUP_SCHEDULE', '0 2 * * *'),
            batchSize: this.configService.get('AUDIT_CLEANUP_BATCH_SIZE', 1000),
        };
    }
};
exports.AuditConfig = AuditConfig;
exports.AuditConfig = AuditConfig = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuditConfig);
//# sourceMappingURL=audit.config.js.map