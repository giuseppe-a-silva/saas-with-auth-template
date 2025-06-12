import { registerEnumType } from '@nestjs/graphql';

/**
 * Payload padrão para envio de notificações
 * Utilizado por todos os canais de envio
 */
export interface NotificationPayload {
  /**
   * Identificador único do tipo de notificação disparada
   */
  event: string;

  /**
   * Categoria/domínio da aplicação onde o evento ocorreu
   */
  category: string;

  /**
   * Data/hora do envio em formato ISO
   */
  timestamp: string;

  /**
   * Informações do destinatário da notificação
   */
  recipient: {
    id: string;
    name: string;
    email: string;
    externalId?: string;
  };

  /**
   * Conteúdo dinâmico que será interpolado no template
   */
  data: Record<string, unknown>;

  /**
   * Informações adicionais para rastreabilidade
   */
  meta: {
    origin: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

/**
 * Enums temporários até o Prisma gerar os tipos
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  REALTIME = 'REALTIME',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

// Registra os enums para o GraphQL
registerEnumType(NotificationChannel, {
  name: 'NotificationChannel',
  description: 'Canais de envio de notificação disponíveis',
});

registerEnumType(NotificationStatus, {
  name: 'NotificationStatus',
  description: 'Status de envio de notificação',
});

/**
 * Resultado do envio de uma notificação
 */
export interface NotificationResult {
  /**
   * Status do envio
   */
  status: NotificationStatus;

  /**
   * ID externo retornado pelo provedor (se disponível)
   */
  externalId?: string;

  /**
   * Mensagem de erro em caso de falha
   */
  error?: string;

  /**
   * Metadados adicionais do provedor
   */
  metadata?: Record<string, unknown>;

  /**
   * Timestamp do envio
   */
  sentAt?: Date;
}

/**
 * Interface base que todos os dispatchers devem implementar
 */
export interface NotificationDispatcher {
  /**
   * Canal suportado por este dispatcher
   */
  readonly channel: NotificationChannel;

  /**
   * Envia uma notificação através do canal específico
   * @param templateContent Conteúdo renderizado do template
   * @param payload Dados da notificação
   * @returns Resultado do envio
   */
  send(
    templateContent: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult>;

  /**
   * Verifica se o dispatcher está configurado e funcionando
   * @returns true se estiver operacional
   */
  isHealthy(): Promise<boolean>;

  /**
   * Retorna configurações específicas do canal (sem dados sensíveis)
   * @returns Configurações públicas do canal
   */
  getConfig(): Record<string, unknown>;
}

/**
 * Configurações específicas para email
 */
export interface EmailConfig {
  from: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Configurações específicas para push notifications
 */
export interface PushConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  sound?: string;
  data?: Record<string, unknown>;
  tags?: string[];
  playerIds?: string[];
}

/**
 * Configurações específicas para notificações realtime
 */
export interface RealtimeConfig {
  channelName: string;
  eventName: string;
  data: Record<string, unknown>;
}
