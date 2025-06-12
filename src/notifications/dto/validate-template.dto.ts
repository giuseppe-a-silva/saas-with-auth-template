import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para validação de template
 */
@InputType({ description: 'Dados para validação de template' })
export class ValidateTemplateDto {
  /**
   * Conteúdo do template a ser validado
   */
  @Field(() => String, { description: 'Conteúdo do template' })
  @IsNotEmpty({ message: 'O conteúdo do template não pode estar vazio.' })
  @IsString({ message: 'O conteúdo do template deve ser uma string.' })
  content!: string;

  /**
   * Chave do evento para verificar dados específicos
   */
  @Field(() => String, { description: 'Chave do evento' })
  @IsNotEmpty({ message: 'A chave do evento não pode estar vazia.' })
  @IsString({ message: 'A chave do evento deve ser uma string.' })
  eventKey!: string;
}

/**
 * Resposta da validação de template
 */
@ObjectType({ description: 'Resultado da validação de template' })
export class TemplateValidationResponse {
  /**
   * Se o template é válido
   */
  @Field(() => Boolean, { description: 'Se o template é válido' })
  isValid!: boolean;

  /**
   * Lista de erros encontrados
   */
  @Field(() => [String], { description: 'Lista de erros encontrados' })
  errors!: string[];

  /**
   * Lista de avisos
   */
  @Field(() => [String], { description: 'Lista de avisos' })
  warnings!: string[];

  /**
   * Variáveis usadas no template
   */
  @Field(() => [String], { description: 'Variáveis usadas no template' })
  usedVariables!: string[];

  /**
   * Variáveis disponíveis para o eventKey
   */
  @Field(() => [String], {
    description: 'Variáveis disponíveis para o eventKey',
  })
  availableVariables!: string[];
}
