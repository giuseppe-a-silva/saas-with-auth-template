import { AuditActionType } from '@prisma/client';

/**
 * Interface para dados da requisição a serem auditados
 */
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

/**
 * Interface para dados da resposta a serem auditados
 */
export interface AuditResponseData {
  statusCode?: number;
  success?: boolean;
  errorMessage?: string;
  responseTime?: number;
}

/**
 * Interface para entrada de log de auditoria
 */
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

/**
 * Interface para log simples em arquivo
 */
export interface SimpleAuditLog {
  timestamp: string;
  action: AuditActionType;
  userId?: string;
  ipAddress?: string;
  endpoint?: string;
  success: boolean;
  message?: string;
}

/**
 * Interface para contexto de auditoria durante a requisição
 */
export interface AuditContext {
  startTime: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  requestData?: Record<string, unknown>;
}

/**
 * Interface para configuração de auditoria por endpoint
 */
export interface EndpointAuditConfig {
  enabled: boolean;
  includeRequestBody: boolean;
  includeResponseBody: boolean;
  sensitiveFields?: string[]; // Campos a serem sanitizados
  logLevel: 'basic' | 'detailed' | 'full';
}

/**
 * Interface para resultado de sanitização
 */
export interface SanitizedData {
  original: Record<string, unknown>;
  sanitized: Record<string, unknown>;
  removedFields: string[];
}

/**
 * Enum para níveis de log de auditoria
 */
export enum AuditLogLevel {
  BASIC = 'basic',
  DETAILED = 'detailed',
  FULL = 'full',
}

/**
 * Interface para estatísticas de auditoria
 */
export interface AuditStats {
  totalLogs: number;
  logsByAction: Record<AuditActionType, number>;
  oldestLog?: Date;
  newestLog?: Date;
  sizeInBytes?: number;
}

/**
 * Interface para resultado de cleanup de logs
 */
export interface AuditCleanupResult {
  deletedCount: number;
  errors: string[];
  totalProcessed: number;
  duration: number;
}
