import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client'; // Reutiliza o enum do Prisma se possível

/**
 * Enum das ações possíveis no sistema de permissões CASL
 * Define todas as operações que podem ser controladas
 */
export enum Action {
  Manage = 'manage', // Representa qualquer ação (super permissão)
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// Registra o enum Action para uso no GraphQL
registerEnumType(Action, {
  name: 'Action', // Nome do enum no schema GraphQL
  description: 'Ações possíveis para controle de permissão (CASL)',
});

// Registra o enum Role do Prisma para uso no GraphQL
registerEnumType(Role, {
  name: 'Role',
  description: 'Papéis de usuário definidos no sistema',
});

/**
 * Entidade GraphQL representando uma permissão específica
 * Utilizada pelo sistema CASL para controle granular de acesso
 * Permite definir permissões além das baseadas em roles
 */
@ObjectType({
  description: 'Representa uma permissão específica no sistema (CASL)',
})
export class Permission {
  /**
   * Identificador único da permissão
   * Gerado automaticamente pelo sistema
   */
  @Field(() => ID, { description: 'ID único da permissão' })
  id: string;

  /**
   * ID do usuário proprietário da permissão
   * Relaciona a permissão a um usuário específico
   */
  @Field(() => String, {
    description: 'ID do usuário ao qual a permissão pertence',
  })
  userId: string;

  /**
   * Ação que está sendo permitida ou negada
   * Utiliza o enum Action para padronização
   */
  @Field(() => Action, {
    description: 'Ação permitida ou negada (ex: read, update)',
  })
  action: Action;

  /**
   * Entidade ou recurso alvo da permissão
   * Pode ser uma entidade específica (User, Post) ou 'all' para tudo
   */
  @Field(() => String, {
    description:
      'Entidade ou recurso ao qual a ação se aplica (ex: User, Post, all)',
  })
  subject: string;

  /**
   * Condições adicionais em formato JSON
   * Permite permissões condicionais (ex: apenas próprios recursos)
   */
  @Field(() => String, {
    nullable: true,
    description: 'Condições adicionais em formato JSON string (opcional)',
  })
  condition?: string | null;

  /**
   * Indica se a permissão é negativa (cannot)
   * false = can (permitir), true = cannot (negar)
   */
  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Indica se a permissão é invertida (cannot)',
  })
  inverted: boolean;

  /**
   * Justificativa ou descrição da permissão
   * Útil para auditoria e compreensão das regras
   */
  @Field(() => String, {
    nullable: true,
    description: 'Justificativa ou descrição da permissão (opcional)',
  })
  reason?: string | null;

  // Não expomos a relação `user` diretamente aqui para evitar ciclos e complexidade,
  // a permissão é geralmente consultada no contexto do usuário.
}
