import { ConfigService } from '@nestjs/config';
export declare enum AuditActionType {
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT",
    LOGIN_FAILED = "LOGIN_FAILED",
    PASSWORD_CHANGE = "PASSWORD_CHANGE",
    DATA_UPDATE = "DATA_UPDATE",
    ACCESS_DENIED = "ACCESS_DENIED",
    PERMISSION_CHECK = "PERMISSION_CHECK",
    TOKEN_REFRESH = "TOKEN_REFRESH",
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
}
export interface AuditRetentionConfig {
    [AuditActionType.LOGIN]: number;
    [AuditActionType.LOGOUT]: number;
    [AuditActionType.LOGIN_FAILED]: number;
    [AuditActionType.PASSWORD_CHANGE]: number;
    [AuditActionType.DATA_UPDATE]: number;
    [AuditActionType.ACCESS_DENIED]: number;
    [AuditActionType.PERMISSION_CHECK]: number;
    [AuditActionType.TOKEN_REFRESH]: number;
    [AuditActionType.ACCOUNT_LOCKED]: number;
}
export declare class AuditConfig {
    private readonly configService;
    constructor(configService: ConfigService);
    get isEnabled(): boolean;
    get enableDetailedLogs(): boolean;
    get retentionPolicyDays(): AuditRetentionConfig;
    get fileLogConfig(): {
        enabled: boolean;
        path: string;
        maxFiles: number;
        maxSize: string;
        datePattern: string;
    };
    get analyticsConfig(): {
        enabled: boolean;
        endpoint: string | undefined;
        apiKey: string | undefined;
        batchSize: number;
        flushInterval: number;
    };
    get performanceConfig(): {
        asyncProcessing: boolean;
        bufferSize: number;
        flushInterval: number;
        maxRetries: number;
    };
    get cleanupConfig(): {
        enabled: boolean;
        schedule: string;
        batchSize: number;
    };
}
