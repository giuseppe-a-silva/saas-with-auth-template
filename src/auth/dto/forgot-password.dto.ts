import { Field, InputType } from '@nestjs/graphql';
import { IsValidEmail } from '../validators/email.validator';

/**
 * DTO para solicitação de recuperação de senha
 * Utilizado quando usuário esqueceu a senha e precisa redefini-la
 */
@InputType({ description: 'Dados para solicitação de recuperação de senha' })
export class ForgotPasswordDto {
  /**
   * Email do usuário que deseja recuperar a senha
   * Deve ser um email válido e registrado no sistema
   */
  @Field({ description: 'Email do usuário para recuperação de senha' })
  @IsValidEmail()
  email: string;
}
