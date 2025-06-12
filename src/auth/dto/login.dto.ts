import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO para validação dos dados de login
 * Utilizado na autenticação de usuários existentes
 */
@InputType()
export class LoginDto {
  /**
   * Identificador do usuário (email ou nome de usuário)
   * Aceita tanto email quanto username para flexibilidade de login
   */
  @Field({ description: 'Identificador do usuário (email ou nome de usuário)' })
  @IsNotEmpty({ message: 'O nome de usuário ou email não pode estar vazio.' })
  @IsString({ message: 'O identificador deve ser uma string.' })
  @MaxLength(255, {
    message: 'O identificador não pode ter mais de 255 caracteres.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  identifier!: string;

  /**
   * Senha do usuário em texto plano
   * Será validada contra o hash armazenado no banco
   */
  @Field({ description: 'Senha do usuário' })
  @IsNotEmpty({ message: 'A senha não pode estar vazia.' })
  @IsString({ message: 'A senha deve ser uma string.' })
  @MinLength(1, { message: 'A senha não pode estar vazia.' })
  @MaxLength(128, { message: 'A senha não pode ter mais de 128 caracteres.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  password!: string;
}
