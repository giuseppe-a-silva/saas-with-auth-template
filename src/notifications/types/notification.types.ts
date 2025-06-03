import { NotificationPayload } from '../interfaces/notification-dispatcher.interface';

/**
 * Categorias de notificação disponíveis no sistema
 * Alinhado com o enum do Prisma
 */
export enum NotificationCategory {
  SISTEMA = 'SISTEMA',
  AUTH = 'AUTH',
  LEADS = 'LEADS',
  MARKETING = 'MARKETING',
  ADMIN = 'ADMIN',
}

/**
 * Dados para criação de um template de notificação
 */
export interface CreateTemplateData {
  name: string;
  title: string;
  content: string;
  category: NotificationCategory;
  channel: string;
  isActive?: boolean;
}

/**
 * Dados para atualização de um template de notificação
 */
export interface UpdateTemplateData {
  title?: string;
  content?: string;
  category?: NotificationCategory;
  channel?: string;
  isActive?: boolean;
}

/**
 * Configuração de retry para falhas de envio
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Configuração de rate limiting
 */
export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
  perDay: number;
  burstLimit: number;
}

/**
 * Dados para envio de notificação
 */
export interface SendNotificationData {
  templateName: string;
  recipient: NotificationPayload['recipient'];
  data: Record<string, unknown>;
  meta?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Configurações gerais do módulo de notificações
 */
export interface NotificationModuleConfig {
  rateLimiting: Record<string, RateLimitConfig>;
  retry: RetryConfig;
  defaultFrom: string;
  enableAuditLogs: boolean;
}
