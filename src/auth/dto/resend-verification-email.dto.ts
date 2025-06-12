import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO para reenvio de email de verificação
 * Contém o email do usuário que deseja reenviar a verificação
 */
@InputType({
  description: 'Dados para reenvio de email de verificação',
})
export class ResendVerificationEmailDto {
  /**
   * Email do usuário para reenvio da verificação
   * @example "usuario@exemplo.com"
   */
  @Field({
    description: 'Email do usuário para reenvio da verificação',
  })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;
}
