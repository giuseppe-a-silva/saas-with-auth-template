import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * DTO para validação dos dados de verificação de email
 * Utilizado na confirmação da conta do usuário
 */
@InputType({ description: 'Dados para verificação de email' })
export class VerifyEmailDto {
  /**
   * Token de verificação de email
   * Enviado por email para o usuário após o cadastro
   */
  @Field({ description: 'Token de verificação de email' })
  @IsNotEmpty({ message: 'O token de verificação não pode estar vazio.' })
  @IsString({ message: 'O token deve ser uma string.' })
  @Length(32, 128, {
    message: 'O token deve ter entre 32 e 128 caracteres.',
  })
  token: string;
}
