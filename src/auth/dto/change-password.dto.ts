import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

/**
 * DTO para validação dos dados de alteração de senha
 * Utilizado quando o usuário deseja alterar sua senha atual
 */
export class ChangePasswordDto {
  /**
   * Senha atual do usuário
   * Necessária para confirmar a identidade antes da alteração
   */
  @IsNotEmpty({ message: 'A senha atual não pode estar vazia.' })
  @IsString({ message: 'A senha atual deve ser uma string.' })
  currentPassword: string;

  /**
   * Nova senha desejada
   * Deve atender aos critérios de segurança definidos
   */
  @IsNotEmpty({ message: 'A nova senha não pode estar vazia.' })
  @IsString({ message: 'A nova senha deve ser uma string.' })
  @IsStrongPassword({
    message: 'A nova senha deve atender aos critérios de segurança definidos.',
  })
  newPassword: string;

  /**
   * Confirmação da nova senha
   * Deve ser idêntica à nova senha para evitar erros de digitação
   */
  @IsNotEmpty({ message: 'A confirmação da senha não pode estar vazia.' })
  @IsString({ message: 'A confirmação da senha deve ser uma string.' })
  confirmPassword: string;
}
