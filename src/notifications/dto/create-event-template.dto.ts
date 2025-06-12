import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NotificationChannel } from '../interfaces/notification-dispatcher.interface';

/**
 * DTO para criação de template de notificação por evento
 * Utilizado na validação dos dados de entrada para templates baseados em eventKey
 */
@InputType({ description: 'Dados para criação de template de evento' })
export class CreateEventTemplateDto {
  /**
   * Chave do evento que dispara a notificação
   * Utilizada para identificar quando usar este template
   */
  @Field(() => String, { description: 'Chave do evento' })
  @IsNotEmpty({ message: 'A chave do evento não pode estar vazia.' })
  @IsString({ message: 'A chave do evento deve ser uma string.' })
  @MinLength(3, {
    message: 'A chave do evento deve ter pelo menos 3 caracteres.',
  })
  @MaxLength(100, {
    message: 'A chave do evento não pode ter mais de 100 caracteres.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  eventKey!: string;

  /**
   * Canal de envio da notificação
   * Define através de qual meio a notificação será enviada
   */
  @Field(() => NotificationChannel, {
    description: 'Canal de envio da notificação',
  })
  @IsNotEmpty({ message: 'O canal não pode estar vazio.' })
  @IsEnum(NotificationChannel, {
    message: 'Canal deve ser uma das opções válidas.',
  })
  channel!: NotificationChannel;

  /**
   * Título da notificação
   * Usado como assunto em emails, título em push notifications, etc.
   */
  @Field(() => String, { description: 'Título da notificação' })
  @IsNotEmpty({ message: 'O título da notificação não pode estar vazio.' })
  @IsString({ message: 'O título deve ser uma string.' })
  @MinLength(5, { message: 'O título deve ter pelo menos 5 caracteres.' })
  @MaxLength(200, { message: 'O título não pode ter mais de 200 caracteres.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title!: string;

  /**
   * Conteúdo da mensagem com sintaxe LiquidJS
   * Permite interpolação de variáveis dinâmicas
   */
  @Field(() => String, {
    description: 'Conteúdo do template com sintaxe LiquidJS',
  })
  @IsNotEmpty({ message: 'O conteúdo do template não pode estar vazio.' })
  @IsString({ message: 'O conteúdo deve ser uma string.' })
  @MinLength(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' })
  @MaxLength(10000, {
    message: 'O conteúdo não pode ter mais de 10.000 caracteres.',
  })
  content!: string;

  /**
   * Status ativo do template
   * Templates inativos não podem ser utilizados para envio
   */
  @Field(() => Boolean, {
    nullable: true,
    description: 'Se o template está ativo',
    defaultValue: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um valor booleano.' })
  isActive?: boolean;
}
