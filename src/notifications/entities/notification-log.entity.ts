import { Field, ObjectType } from '@nestjs/graphql';
import { NotificationStatus } from '../interfaces/notification-dispatcher.interface';

/**
 * Entidade de log de notificação para auditoria
 * Registra todas as tentativas de envio de notificação
 */
@ObjectType({ description: 'Log de notificação para auditoria' })
export class NotificationLog {
  @Field(() => String, { description: 'ID único do log' })
  id: string;

  @Field(() => String, { description: 'ID da notificação' })
  notificationId: string;

  @Field(() => String, { description: 'Nome do template usado' })
  templateName: string;

  @Field(() => String, { description: 'Canal de envio' })
  channel: string;

  @Field(() => String, { description: 'Categoria da notificação' })
  category: string;

  @Field(() => String, { description: 'Email do destinatário' })
  recipientEmail: string;

  @Field(() => String, { description: 'Status do envio' })
  status: NotificationStatus;

  @Field(() => String, {
    nullable: true,
    description: 'ID externo do provedor',
  })
  externalId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Mensagem de erro se houve falha',
  })
  errorMessage?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Código de erro específico',
  })
  errorCode?: string;

  @Field(() => Number, { description: 'Número da tentativa (para retry)' })
  attemptNumber: number;

  @Field(() => String, {
    description: 'Provedor usado (smtp, aws-ses, onesignal, etc.)',
  })
  provider: string;

  @Field(() => String, {
    nullable: true,
    description: 'Metadados adicionais em JSON',
  })
  metadata?: string;

  @Field(() => Date, { description: 'Data de criação do log' })
  createdAt: Date;

  @Field(() => Date, { nullable: true, description: 'Data efetiva do envio' })
  sentAt?: Date;

  @Field(() => Number, {
    description: 'Tempo de processamento em milissegundos',
  })
  processingTimeMs: number;
}
