import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Role } from '@prisma/client'; // Reutiliza o enum Role do Prisma
// Permission type já foi definido em src/permissions/entities/permission.entity.ts
// e será importado onde necessário, não precisa redefinir.

/**
 * Entidade GraphQL representando um usuário do sistema
 * Define a estrutura de dados exposta pela API GraphQL
 */
@ObjectType({ description: 'Representa um usuário no sistema' })
export class User {
  /**
   * Identificador único do usuário
   * Gerado automaticamente pelo sistema
   */
  @Field(() => ID, { description: 'ID único do usuário' })
  id!: string;

  /**
   * Endereço de email único do usuário
   * Utilizado para login e comunicação
   */
  @Field(() => String, { description: 'Endereço de e-mail único do usuário' })
  email!: string;

  /**
   * Nome de usuário único no sistema
   * Alternativa para login junto com email
   */
  @Field(() => String, { description: 'Nome de usuário único' })
  username!: string;

  // A senha NUNCA deve ser exposta na API GraphQL por questões de segurança

  /**
   * Indica se o email do usuário foi verificado
   * Usuários devem verificar email antes de fazer login
   */
  @Field(() => Boolean, { description: 'Indica se o email foi verificado' })
  emailVerified!: boolean;

  /**
   * Papel (role) do usuário no sistema
   * Define o nível de acesso e permissões
   */
  @Field(() => Role, { description: 'Papel (role) do usuário no sistema' })
  role!: Role;

  /**
   * Data e hora de criação do registro
   * Definido automaticamente na criação
   */
  @Field(() => Date, { description: 'Data e hora de criação do usuário' })
  createdAt!: Date;

  /**
   * Data e hora da última atualização
   * Atualizado automaticamente em modificações
   */
  @Field(() => Date, {
    description: 'Data e hora da última atualização do usuário',
  })
  updatedAt!: Date;

  // Futura expansão: campo para permissões específicas se necessário
  // @Field(() => [Permission], { nullable: 'itemsAndList', description: 'Permissões específicas do usuário' })
  // permissions?: Permission[];
}
