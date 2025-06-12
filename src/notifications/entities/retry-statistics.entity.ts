import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Entidade GraphQL para estatísticas de retry
 * Representa dados sobre tentativas de reenvio de notificações
 */
@ObjectType({ description: 'Estatísticas do sistema de retry de notificações' })
export class RetryStatistics {
  @Field(() => Number, { description: 'Número de notificações pendentes' })
  pending!: number;

  @Field(() => Number, {
    description: 'Número de notificações sendo reenviadas',
  })
  retrying!: number;

  @Field(() => Number, {
    description: 'Número de notificações enviadas com sucesso',
  })
  success!: number;

  @Field(() => Number, { description: 'Número de notificações que falharam' })
  failed!: number;

  @Field(() => Number, { description: 'Número total de notificações' })
  total!: number;
}
