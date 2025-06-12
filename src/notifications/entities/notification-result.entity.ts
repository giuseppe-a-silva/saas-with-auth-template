import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Entidade GraphQL para resultado de notificação
 * Representa o retorno das operações de envio de notificação
 */
@ObjectType({ description: 'Resultado do envio de uma notificação' })
export class NotificationResult {
  @Field(() => String, { description: 'Status do envio da notificação' })
  status!: string;

  @Field(() => String, {
    nullable: true,
    description: 'ID externo fornecido pelo provedor de notificação',
  })
  externalId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Mensagem de erro caso tenha ocorrido algum problema',
  })
  error?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Metadados adicionais do envio em formato JSON',
  })
  metadata?: string;

  @Field(() => Date, {
    nullable: true,
    description: 'Data e hora em que a notificação foi enviada',
  })
  sentAt?: Date;
}
