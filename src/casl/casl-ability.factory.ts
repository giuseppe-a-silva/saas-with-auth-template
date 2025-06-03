import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  InferSubjects,
} from '@casl/ability';
import { Injectable, Logger } from '@nestjs/common';
import { Permission as PrismaPermission, Role, User } from '@prisma/client';
import { Action } from '../permissions/entities/permission.entity';
import { PermissionsService } from '../permissions/permissions.service';

/**
 * Tipos de sujeitos que o CASL pode gerenciar
 * Inclui entidades do sistema e permissões globais
 */
export type Subjects = InferSubjects<User> | 'User' | 'Post' | 'all';

/**
 * Tipo principal da Ability CASL usada na aplicação
 * Define a estrutura [Action, Subjects] para verificação de permissões
 */
export type AppAbility = Ability<[Action, Subjects]>;

/**
 * Factory responsável pela criação de abilities CASL para usuários
 * Combina permissões baseadas em roles com permissões específicas do banco de dados
 */
@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Cria uma instância de Ability personalizada para um usuário específico
   * Combina permissões baseadas em roles (ADMIN, EDITOR, USER) com permissões
   * específicas armazenadas no banco de dados
   *
   * @param user - Usuário para o qual criar as abilities (sem senha)
   * @returns Instância de AppAbility com todas as permissões do usuário
   * @throws {Error} Se houver erro ao buscar permissões do banco
   *
   * @example
   * ```typescript
   * const ability = await caslAbilityFactory.createForUser(user);
   * const canReadPost = ability.can(Action.Read, 'Post');
   * ```
   */
  async createForUser(user: Omit<User, 'password'>): Promise<AppAbility> {
    this.logger.debug('Criando abilities para usuário', {
      userId: user.id,
      userRole: user.role,
    });

    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>,
    );

    // --- Permissões Baseadas em Papel (Role) ---
    if (user.role === Role.ADMIN) {
      can(Action.Manage, 'all'); // Admin pode fazer tudo
      this.logger.debug('Permissões de ADMIN aplicadas', { userId: user.id });
    } else if (user.role === Role.EDITOR) {
      can(Action.Read, 'all'); // Editor pode ler tudo
      this.logger.debug('Permissões de EDITOR aplicadas', { userId: user.id });
    } else {
      can(Action.Read, 'all'); // USER pode ler tudo
      this.logger.debug('Permissões de USER aplicadas', { userId: user.id });
    }

    // --- Permissões Baseadas em Políticas do Banco de Dados ---
    try {
      const dbPermissions = await this.permissionsService.findUserPermissions(
        user.id,
      );

      this.logger.debug('Aplicando permissões específicas do banco', {
        userId: user.id,
        permissionsCount: dbPermissions.length,
      });

      dbPermissions.forEach((permission: PrismaPermission) => {
        const action = permission.action as Action;
        const subject = permission.subject as Extract<Subjects, string>;
        let condition: Record<string, unknown> | undefined = undefined;

        // Parse da condição JSON se existir
        try {
          if (permission.condition) {
            condition = JSON.parse(permission.condition) as Record<
              string,
              unknown
            >;
          }
        } catch (error) {
          this.logger.warn('Erro ao parsear condição JSON da permissão', {
            permissionId: permission.id,
            condition: permission.condition,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Aplica permissão (can ou cannot)
        if (permission.inverted) {
          cannot(action, subject, condition).because(
            permission.reason ?? 'Permissão negada',
          );
          this.logger.debug('Permissão negativa aplicada', {
            userId: user.id,
            action,
            subject,
            reason: permission.reason,
          });
        } else {
          can(action, subject, condition).because(
            permission.reason ?? 'Permissão concedida',
          );
          this.logger.debug('Permissão positiva aplicada', {
            userId: user.id,
            action,
            subject,
            reason: permission.reason,
          });
        }
      });

      this.logger.log('Abilities criadas com sucesso', {
        userId: user.id,
        rolePermissions: user.role,
        dbPermissionsCount: dbPermissions.length,
      });

      return build();
    } catch (error) {
      this.logger.error('Erro ao criar abilities para usuário', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
