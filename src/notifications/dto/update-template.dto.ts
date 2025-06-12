import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO para atualização de template de notificação
 * Todos os campos são opcionais para permitir atualizações parciais
 */
@InputType({ description: 'Dados para atualização de template de notificação' })
export class UpdateTemplateDto {
  /**
   * Título da notificação
   * Usado como assunto em emails, título em push notifications, etc.
   */
  @Field(() => String, {
    nullable: true,
    description: 'Título da notificação',
  })
  @IsOptional()
  @IsString({ message: 'O título deve ser uma string.' })
  @MinLength(5, { message: 'O título deve ter pelo menos 5 caracteres.' })
  @MaxLength(200, { message: 'O título não pode ter mais de 200 caracteres.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title?: string;

  /**
   * Conteúdo da mensagem com sintaxe LiquidJS
   * Permite interpolação de variáveis dinâmicas
   */
  @Field(() => String, {
    nullable: true,
    description: 'Conteúdo do template com sintaxe LiquidJS',
  })
  @IsOptional()
  @IsString({ message: 'O conteúdo deve ser uma string.' })
  @MinLength(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' })
  @MaxLength(10000, {
    message: 'O conteúdo não pode ter mais de 10.000 caracteres.',
  })
  content?: string;

  /**
   * Status ativo do template
   * Templates inativos não podem ser utilizados para envio
   */
  @Field(() => Boolean, {
    nullable: true,
    description: 'Se o template está ativo',
  })
  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um valor booleano.' })
  isActive?: boolean;
}
