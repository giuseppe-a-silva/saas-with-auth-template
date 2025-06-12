import { Field, ID, ObjectType } from '@nestjs/graphql';
import { NotificationChannel } from '../interfaces/notification-dispatcher.interface';

/**
 * Entity GraphQL representando um template de notificação por evento
 * Define a estrutura de dados exposta pela API GraphQL para templates baseados em eventKey
 */
@ObjectType({ description: 'Template de notificação baseado em evento' })
export class EventNotificationTemplate {
  /**
   * Identificador único do template
   * Gerado automaticamente pelo sistema
   */
  @Field(() => ID, { description: 'ID único do template' })
  id!: string;

  /**
   * Chave do evento que dispara a notificação
   * Utilizada para identificar quando usar este template
   */
  @Field(() => String, { description: 'Chave do evento' })
  eventKey!: string;

  /**
   * Canal de envio da notificação
   * Define através de qual meio a notificação será enviada
   */
  @Field(() => NotificationChannel, {
    description: 'Canal de envio da notificação',
  })
  channel!: NotificationChannel;

  /**
   * Título da notificação
   * Usado como assunto em emails, título em push notifications, etc.
   */
  @Field(() => String, { description: 'Título da notificação' })
  title!: string;

  /**
   * Conteúdo da mensagem com sintaxe LiquidJS
   * Permite interpolação de variáveis dinâmicas
   */
  @Field(() => String, {
    description: 'Conteúdo do template com sintaxe LiquidJS',
  })
  content!: string;

  /**
   * Status ativo do template
   * Templates inativos não podem ser utilizados para envio
   */
  @Field(() => Boolean, { description: 'Se o template está ativo' })
  isActive!: boolean;

  /**
   * ID do usuário que criou o template
   * Null para templates do sistema criados automaticamente
   */
  @Field(() => ID, {
    nullable: true,
    description: 'ID do usuário que criou o template',
  })
  createdBy!: string | null;

  /**
   * Data e hora de criação do template
   * Definido automaticamente na criação
   */
  @Field(() => Date, { description: 'Data e hora de criação do template' })
  createdAt!: Date;

  /**
   * Data e hora da última atualização
   * Atualizado automaticamente em modificações
   */
  @Field(() => Date, { description: 'Data e hora da última atualização' })
  updatedAt!: Date;
}
