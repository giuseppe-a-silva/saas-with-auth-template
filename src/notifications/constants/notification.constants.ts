import { RateLimitConfig, RetryConfig } from '../types/notification.types';

/**
 * Configuração padrão de retry para falhas de envio
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 segundo
  maxDelayMs: 60000, // 1 minuto
  backoffMultiplier: 2,
};

/**
 * Configurações padrão de rate limiting por canal
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: {
    perMinute: 60,
    perHour: 1000,
    perDay: 10000,
    burstLimit: 5,
  },
  email: {
    perMinute: 10,
    perHour: 200,
    perDay: 1000,
    burstLimit: 3,
  },
  push: {
    perMinute: 30,
    perHour: 500,
    perDay: 5000,
    burstLimit: 5,
  },
  realtime: {
    perMinute: 100,
    perHour: 2000,
    perDay: 20000,
    burstLimit: 10,
  },
};

/**
 * Timeouts padrão para requisições por canal (em milissegundos)
 */
export const DEFAULT_TIMEOUTS = {
  email: 30000, // 30 segundos
  push: 10000, // 10 segundos
  realtime: 5000, // 5 segundos
} as const;

/**
 * Nomes dos templates padrão do sistema
 */
export const SYSTEM_TEMPLATES = {
  EMAIL_CONFIRMATION: 'email_confirmation',
  PASSWORD_RESET: 'password_reset',
  WELCOME_PUSH: 'welcome_push',
  LEAD_NOTIFICATION: 'lead_notification',
  ERROR_ALERT: 'error_alert',
} as const;

/**
 * Headers padrão para requisições HTTP
 */
export const DEFAULT_HTTP_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'EduMatch-Notifications/1.0',
} as const;

/**
 * Mensagens de erro padrão
 */
export const ERROR_MESSAGES = {
  DISPATCHER_NOT_FOUND: 'Dispatcher não encontrado para o canal especificado',
  CHANNEL_UNAVAILABLE: 'Canal de notificação não está disponível',
  INVALID_CHANNEL: 'Canal de notificação inválido',
  TEMPLATE_NOT_FOUND: 'Template de notificação não encontrado',
  TEMPLATE_INACTIVE: 'Template está inativo',
  INVALID_RECIPIENT: 'Dados do destinatário são inválidos',
  RENDERING_FAILED: 'Falha na renderização do template',
  RENDER_FAILED: 'Falha na renderização do template',
  SEND_FAILED: 'Falha no envio da notificação',
  RATE_LIMIT_EXCEEDED: 'Limite de rate limit excedido',
  RETRY_LIMIT_EXCEEDED: 'Limite máximo de tentativas excedido',
  CONFIGURATION_ERROR: 'Erro de configuração',
} as const;

/**
 * Categorias padrão de notificação
 */
export const NOTIFICATION_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  SYSTEM: 'system',
  MARKETING: 'marketing',
  TRANSACTIONAL: 'transactional',
  ALERTS: 'alerts',
} as const;
