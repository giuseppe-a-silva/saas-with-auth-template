import { SetMetadata } from '@nestjs/common';
import { Action } from '../../permissions/entities/permission.entity';
import { Subjects } from '../casl-ability.factory';

/**
 * Interface para definir a estrutura de uma regra de permissão requerida
 * Utilizada pelo decorator @CheckPermissions para verificação de acesso
 */
export interface RequiredRule {
  /** Ação que o usuário deve poder executar */
  action: Action;
  /** Entidade ou recurso sobre o qual a ação deve ser executada */
  subject: Subjects;
  // conditions?: any; // Condições futuras podem ser adicionadas se necessário
}

/**
 * Chave para armazenar as regras de permissão nos metadados do NestJS
 * Utilizada pelo CaslGuard para recuperar as regras de verificação
 */
export const CHECK_PERMISSIONS_KEY = 'check_permissions';

/**
 * Decorator para definir permissões necessárias em rotas ou métodos
 *
 * Anexa regras de permissão aos metadados que serão verificadas pelo CaslGuard.
 * Permite controle granular de acesso baseado em ações e recursos específicos.
 *
 * @param rules - Uma ou mais regras de permissão requeridas
 * @returns MethodDecorator que aplica as regras aos metadados
 *
 * @example
 * ```typescript
 * @CheckPermissions(
 *   { action: Action.Read, subject: 'User' },
 *   { action: Action.Update, subject: 'Post' }
 * )
 * @Mutation(() => User)
 * async updateUserProfile() {
 *   // Método protegido pelas permissões definidas
 * }
 * ```
 */
export const CheckPermissions = (...rules: RequiredRule[]): MethodDecorator =>
  SetMetadata(CHECK_PERMISSIONS_KEY, rules);
