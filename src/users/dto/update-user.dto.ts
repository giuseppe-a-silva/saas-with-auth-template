import { Field, InputType, PartialType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/**
 * DTO para atualização de usuário
 * Permite atualizar campos específicos do perfil do usuário
 */
@InputType({ description: 'Dados para atualizar um usuário existente' })
export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Sobrescreve a senha para ser opcional na atualização
  @Field({ nullable: true, description: 'Nova senha do usuário (opcional)' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  @IsString({ message: 'Senha deve ser uma string' })
  password?: string;
}
