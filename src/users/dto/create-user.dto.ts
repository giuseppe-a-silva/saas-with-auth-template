import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO para criação de usuário
 * Geralmente usado via processo de registro
 */
@InputType({
  description:
    'Dados para criar um novo usuário (geralmente feito via registro)',
})
export class CreateUserDto {
  @Field({ description: 'Email do usuário' })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email!: string;

  @Field({ description: 'Nome de usuário único' })
  @IsString({ message: 'Username deve ser uma string' })
  username!: string;

  @Field({ description: 'Senha do usuário (mínimo 8 caracteres)' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  @IsString({ message: 'Senha deve ser uma string' })
  password!: string;
}
