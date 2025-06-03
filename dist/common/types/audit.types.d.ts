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
export interface AuditRequestData {
    endpoint?: string;
    method?: string;
    userAgent?: string;
    ipAddress?: string;
    userId?: string;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
}
export interface AuditResponseData {
    statusCode?: number;
    success?: boolean;
    errorMessage?: string;
    responseTime?: number;
}
export interface CreateAuditLogInput {
    userId?: string;
    action: AuditActionType;
    resource?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    requestData?: Record<string, unknown>;
    responseData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
}
export interface SimpleAuditLog {
    timestamp: string;
    action: AuditActionType;
    userId?: string;
    ipAddress?: string;
    endpoint?: string;
    success: boolean;
    message?: string;
}
export interface AuditContext {
    startTime: number;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    requestData?: Record<string, unknown>;
}
export interface EndpointAuditConfig {
    enabled: boolean;
    includeRequestBody: boolean;
    includeResponseBody: boolean;
    sensitiveFields?: string[];
    logLevel: 'basic' | 'detailed' | 'full';
}
export interface SanitizedData {
    original: Record<string, unknown>;
    sanitized: Record<string, unknown>;
    removedFields: string[];
}
export declare enum AuditLogLevel {
    BASIC = "basic",
    DETAILED = "detailed",
    FULL = "full"
}
export interface AuditStats {
    totalLogs: number;
    logsByAction: Record<AuditActionType, number>;
    oldestLog?: Date;
    newestLog?: Date;
    sizeInBytes?: number;
}
export interface AuditCleanupResult {
    deletedCount: number;
    errors: string[];
    totalProcessed: number;
    duration: number;
}
