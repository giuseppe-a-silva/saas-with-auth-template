import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../validators/strong-password.validator';

/**
 * DTO para validação dos dados de alteração de senha
 * Utilizado quando o usuário deseja alterar sua senha atual
 */
@InputType({ description: 'Dados para alteração de senha' })
export class ChangePasswordDto {
  /**
   * Senha atual do usuário
   * Necessária para confirmar a identidade antes da alteração
   */
  @Field({ description: 'Senha atual do usuário' })
  @IsNotEmpty({ message: 'A senha atual não pode estar vazia.' })
  @IsString({ message: 'A senha atual deve ser uma string.' })
  currentPassword: string;

  /**
   * Nova senha desejada
   * Deve atender aos critérios de segurança definidos
   */
  @Field({ description: 'Nova senha do usuário' })
  @IsNotEmpty({ message: 'A nova senha não pode estar vazia.' })
  @IsString({ message: 'A nova senha deve ser uma string.' })
  @IsStrongPassword()
  newPassword: string;
}
