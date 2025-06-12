import { Field, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * DTO para dados do destinatário da notificação
 */
@InputType({ description: 'Dados do destinatário da notificação' })
export class RecipientDto {
  /**
   * ID único do destinatário
   */
  @Field(() => String, { description: 'ID único do destinatário' })
  @IsNotEmpty({ message: 'O ID do destinatário não pode estar vazio.' })
  @IsString({ message: 'O ID deve ser uma string.' })
  id!: string;

  /**
   * Nome do destinatário
   */
  @Field(() => String, { description: 'Nome do destinatário' })
  @IsNotEmpty({ message: 'O nome do destinatário não pode estar vazio.' })
  @IsString({ message: 'O nome deve ser uma string.' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  @MaxLength(200, { message: 'O nome não pode ter mais de 200 caracteres.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  /**
   * Email do destinatário
   */
  @Field(() => String, { description: 'Email do destinatário' })
  @IsNotEmpty({ message: 'O email não pode estar vazio.' })
  @IsEmail({}, { message: 'Email deve ter um formato válido.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  /**
   * ID externo do destinatário (opcional)
   */
  @Field(() => String, {
    nullable: true,
    description: 'ID externo do destinatário',
  })
  @IsOptional()
  @IsString({ message: 'O ID externo deve ser uma string.' })
  externalId?: string;
}

/**
 * DTO para envio de notificação
 * Utilizado na validação dos dados de entrada
 */
@InputType({ description: 'Dados para envio de notificação' })
export class SendNotificationDto {
  /**
   * Nome do template a ser utilizado
   */
  @Field(() => String, { description: 'Nome do template a ser utilizado' })
  @IsNotEmpty({ message: 'O nome do template não pode estar vazio.' })
  @IsString({ message: 'O nome do template deve ser uma string.' })
  templateName!: string;

  /**
   * Dados do destinatário da notificação
   */
  @Field(() => RecipientDto, { description: 'Dados do destinatário' })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient!: RecipientDto;

  /**
   * Dados dinâmicos para interpolação no template
   */
  @Field(() => String, {
    description: 'Dados dinâmicos em formato JSON para interpolação',
  })
  @IsNotEmpty({ message: 'Os dados não podem estar vazios.' })
  @IsString({ message: 'Os dados devem ser uma string JSON válida.' })
  data!: string; // String JSON que será parseada

  /**
   * Metadados opcionais para rastreabilidade
   */
  @Field(() => String, {
    nullable: true,
    description: 'Metadados opcionais em formato JSON',
  })
  @IsOptional()
  @IsString({ message: 'Os metadados devem ser uma string JSON válida.' })
  meta?: string; // String JSON que será parseada
}
