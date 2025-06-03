import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Entidade GraphQL para status de saúde dos canais
 * Representa informações sobre o estado dos canais de notificação
 */
@ObjectType({ description: 'Status de saúde de um canal de notificação' })
export class ChannelHealthStatus {
  @Field(() => String, { description: 'Nome do canal de notificação' })
  channel: string;

  @Field(() => String, {
    description: 'Provedor do canal (ex: SendGrid, Twilio)',
  })
  provider: string;

  @Field(() => Boolean, {
    description: 'Indica se o canal está funcionando corretamente',
  })
  isHealthy: boolean;

  @Field(() => Boolean, { description: 'Indica se o canal está configurado' })
  isConfigured: boolean;

  @Field(() => Number, {
    nullable: true,
    description: 'Timeout configurado para o canal em milissegundos',
  })
  timeout?: number;
}
