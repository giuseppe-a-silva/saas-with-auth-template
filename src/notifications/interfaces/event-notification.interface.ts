/**
 * Payload para envio de notificação por evento
 */
export interface EventNotificationPayload {
  /**
   * Timestamp da ocorrência do evento
   */
  timestamp: string;

  /**
   * Dados dinâmicos para interpolação no template
   */
  data: Record<string, unknown>;

  /**
   * Informações do destinatário
   */
  recipient: {
    id: string;
    name: string;
    email: string;
    externalId?: string;
  };

  /**
   * Metadados adicionais opcionais
   */
  meta?: Record<string, unknown>;
}

/**
 * Resultado do processamento de evento
 */
export interface EventNotificationResult {
  /**
   * Chave do evento processado
   */
  eventKey: string;

  /**
   * Número total de canais processados
   */
  totalChannels: number;

  /**
   * Número de envios bem-sucedidos
   */
  successCount: number;

  /**
   * Número de falhas
   */
  failureCount: number;

  /**
   * Detalhes por canal
   */
  channelResults: Array<{
    channel: string;
    success: boolean;
    externalId?: string;
    error?: string;
  }>;

  /**
   * ID do job no BullMQ
   */
  jobId: string;
}

/**
 * Template padrão gerado automaticamente
 */
export interface DefaultTemplate {
  eventKey: string;
  channel: string;
  title: string;
  content: string;
}

/**
 * Configuração de canais para um evento
 */
export interface EventChannelConfig {
  eventKey: string;
  enabledChannels: string[];
  isActive: boolean;
}
