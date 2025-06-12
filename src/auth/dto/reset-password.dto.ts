import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

/**
 * DTO para redefinição de senha usando token de recuperação
 * Utilizado na confirmação da nova senha após solicitação de recuperação
 */
@InputType({ description: 'Dados para redefinição de senha' })
export class ResetPasswordDto {
  /**
   * Token de recuperação de senha
   * Enviado por email para o usuário após solicitação
   */
  @Field({ description: 'Token de recuperação de senha' })
  @IsNotEmpty({ message: 'O token de recuperação não pode estar vazio.' })
  @IsString({ message: 'O token deve ser uma string.' })
  @Length(32, 128, {
    message: 'O token deve ter entre 32 e 128 caracteres.',
  })
  token!: string;

  /**
   * Nova senha do usuário
   * Deve atender aos critérios de segurança
   */
  @Field({ description: 'Nova senha do usuário' })
  @IsStrongPassword()
  newPassword!: string;
}
