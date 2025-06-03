import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Tipos de ações auditáveis no sistema
 */
export enum AuditActionType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  DATA_UPDATE = 'DATA_UPDATE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_CHECK = 'PERMISSION_CHECK',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
  TEMPLATE_CREATED = 'TEMPLATE_CREATED',
  TEMPLATE_UPDATED = 'TEMPLATE_UPDATED',
  TEMPLATE_DELETED = 'TEMPLATE_DELETED',
}

/**
 * Configuração de retenção de logs por tipo de ação
 */
export interface AuditRetentionConfig {
  [AuditActionType.LOGIN]: number; // 180 dias
  [AuditActionType.LOGOUT]: number; // 180 dias
  [AuditActionType.LOGIN_FAILED]: number; // 90 dias
  [AuditActionType.PASSWORD_CHANGE]: number; // 1 ano
  [AuditActionType.DATA_UPDATE]: number; // 1 ano
  [AuditActionType.ACCESS_DENIED]: number; // 90 dias
  [AuditActionType.PERMISSION_CHECK]: number; // 90 dias
  [AuditActionType.TOKEN_REFRESH]: number; // 90 dias
  [AuditActionType.ACCOUNT_LOCKED]: number; // 1 ano
  [AuditActionType.NOTIFICATION_SENT]: number; // 90 dias
  [AuditActionType.NOTIFICATION_FAILED]: number; // 90 dias
  [AuditActionType.TEMPLATE_CREATED]: number; // 1 ano
  [AuditActionType.TEMPLATE_UPDATED]: number; // 1 ano
  [AuditActionType.TEMPLATE_DELETED]: number; // 1 ano
}

/**
 * Configuração do sistema de auditoria baseada no ambiente
 */
@Injectable()
export class AuditConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Habilita ou desabilita logs de auditoria baseado no ambiente
   */
  get isEnabled(): boolean {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    return this.configService.get<boolean>('AUDIT_ENABLED', env !== 'test');
  }

  /**
   * Habilita logs detalhados (desenvolvimento vs produção)
   */
  get enableDetailedLogs(): boolean {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    return this.configService.get<boolean>(
      'AUDIT_DETAILED_LOGS',
      env === 'development',
    );
  }

  /**
   * Configuração de retenção de logs por tipo de ação (em dias)
   */
  get retentionPolicyDays(): AuditRetentionConfig {
    return {
      [AuditActionType.LOGIN]: this.configService.get<number>(
        'AUDIT_RETENTION_LOGIN',
        180,
      ),
      [AuditActionType.LOGOUT]: this.configService.get<number>(
        'AUDIT_RETENTION_LOGOUT',
        180,
      ),
      [AuditActionType.LOGIN_FAILED]: this.configService.get<number>(
        'AUDIT_RETENTION_LOGIN_FAILED',
        90,
      ),
      [AuditActionType.PASSWORD_CHANGE]: this.configService.get<number>(
        'AUDIT_RETENTION_PASSWORD_CHANGE',
        365,
      ),
      [AuditActionType.DATA_UPDATE]: this.configService.get<number>(
        'AUDIT_RETENTION_DATA_UPDATE',
        365,
      ),
      [AuditActionType.ACCESS_DENIED]: this.configService.get<number>(
        'AUDIT_RETENTION_ACCESS_DENIED',
        90,
      ),
      [AuditActionType.PERMISSION_CHECK]: this.configService.get<number>(
        'AUDIT_RETENTION_PERMISSION_CHECK',
        90,
      ),
      [AuditActionType.TOKEN_REFRESH]: this.configService.get<number>(
        'AUDIT_RETENTION_TOKEN_REFRESH',
        90,
      ),
      [AuditActionType.ACCOUNT_LOCKED]: this.configService.get<number>(
        'AUDIT_RETENTION_ACCOUNT_LOCKED',
        365,
      ),
      [AuditActionType.NOTIFICATION_SENT]: this.configService.get<number>(
        'AUDIT_RETENTION_NOTIFICATION_SENT',
        90,
      ),
      [AuditActionType.NOTIFICATION_FAILED]: this.configService.get<number>(
        'AUDIT_RETENTION_NOTIFICATION_FAILED',
        90,
      ),
      [AuditActionType.TEMPLATE_CREATED]: this.configService.get<number>(
        'AUDIT_RETENTION_TEMPLATE_CREATED',
        365,
      ),
      [AuditActionType.TEMPLATE_UPDATED]: this.configService.get<number>(
        'AUDIT_RETENTION_TEMPLATE_UPDATED',
        365,
      ),
      [AuditActionType.TEMPLATE_DELETED]: this.configService.get<number>(
        'AUDIT_RETENTION_TEMPLATE_DELETED',
        365,
      ),
    };
  }

  /**
   * Configuração de arquivo de log para dados simples
   */
  get fileLogConfig(): {
    enabled: boolean;
    path: string;
    maxFiles: number;
    maxSize: string;
    datePattern: string;
  } {
    const env = this.configService.get<string>('NODE_ENV', 'development');

    return {
      enabled: this.configService.get<boolean>('AUDIT_FILE_LOGS_ENABLED', true),
      path: this.configService.get<string>(
        'AUDIT_LOG_PATH',
        `./logs/audit-${env}.log`,
      ),
      maxFiles: this.configService.get<number>('AUDIT_LOG_MAX_FILES', 30),
      maxSize: this.configService.get<string>('AUDIT_LOG_MAX_SIZE', '100MB'),
      datePattern: this.configService.get<string>(
        'AUDIT_LOG_DATE_PATTERN',
        'YYYY-MM-DD',
      ),
    };
  }

  /**
   * Configuração para integração com analytics
   */
  get analyticsConfig(): {
    enabled: boolean;
    endpoint: string | undefined;
    apiKey: string | undefined;
    batchSize: number;
    flushInterval: number;
  } {
    return {
      enabled: this.configService.get<boolean>(
        'AUDIT_ANALYTICS_ENABLED',
        false,
      ),
      endpoint: this.configService.get<string>('AUDIT_ANALYTICS_ENDPOINT'),
      apiKey: this.configService.get<string>('AUDIT_ANALYTICS_API_KEY'),
      batchSize: this.configService.get<number>(
        'AUDIT_ANALYTICS_BATCH_SIZE',
        100,
      ),
      flushInterval: this.configService.get<number>(
        'AUDIT_ANALYTICS_FLUSH_INTERVAL',
        30000,
      ), // 30 segundos
    };
  }

  /**
   * Configuração de performance para o middleware
   */
  get performanceConfig(): {
    asyncProcessing: boolean;
    bufferSize: number;
    flushInterval: number;
    maxRetries: number;
  } {
    return {
      asyncProcessing: this.configService.get<boolean>(
        'AUDIT_ASYNC_PROCESSING',
        true,
      ),
      bufferSize: this.configService.get<number>('AUDIT_BUFFER_SIZE', 1000),
      flushInterval: this.configService.get<number>(
        'AUDIT_FLUSH_INTERVAL',
        5000,
      ), // 5 segundos
      maxRetries: this.configService.get<number>('AUDIT_MAX_RETRIES', 3),
    };
  }

  /**
   * Configuração de limpeza automática
   */
  get cleanupConfig(): {
    enabled: boolean;
    schedule: string;
    batchSize: number;
  } {
    return {
      enabled: this.configService.get<boolean>('AUDIT_CLEANUP_ENABLED', true),
      schedule: this.configService.get<string>(
        'AUDIT_CLEANUP_SCHEDULE',
        '0 2 * * *',
      ), // Todo dia às 2h
      batchSize: this.configService.get<number>(
        'AUDIT_CLEANUP_BATCH_SIZE',
        1000,
      ),
    };
  }
}
