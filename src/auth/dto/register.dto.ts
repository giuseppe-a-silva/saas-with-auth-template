import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { IsValidEmail } from '../validators/email.validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

/**
 * DTO para validação dos dados de registro de usuário
 * Utilizado na criação de novas contas no sistema
 */
@InputType()
export class RegisterDto {
  /**
   * Nome de usuário único no sistema
   * Deve ter entre 3 e 50 caracteres, apenas letras, números, hífen e underscore
   */
  @Field({ description: 'Nome de usuário único no sistema' })
  @IsNotEmpty({ message: 'O nome de usuário não pode estar vazio.' })
  @IsString({ message: 'O nome de usuário deve ser uma string.' })
  @Length(3, 50, {
    message: 'O nome de usuário deve ter entre 3 e 50 caracteres.',
  })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'O nome de usuário pode conter apenas letras, números, hífen (-) e underscore (_).',
  })
  username!: string;

  /**
   * Endereço de email único do usuário
   * Validação robusta com verificação de domínios descartáveis
   */
  @Field({ description: 'Endereço de email único do usuário' })
  @IsNotEmpty({ message: 'O email não pode estar vazio.' })
  @IsValidEmail({
    message:
      'Email deve ter um formato válido e não pode ser um email temporário.',
  })
  email!: string;

  /**
   * Senha para acesso à conta
   * Aplica validação condicional baseada em feature flag
   * - Se feature flag ativa: validação robusta (12+ chars, maiúscula, minúscula, número)
   * - Se feature flag inativa: validação básica (8+ chars)
   */
  @Field({ description: 'Senha para acesso à conta' })
  @IsNotEmpty({ message: 'A senha não pode estar vazia.' })
  @IsString({ message: 'A senha deve ser uma string.' })
  @IsStrongPassword({
    message: 'A senha deve atender aos critérios de segurança definidos.',
  })
  password!: string;
}
