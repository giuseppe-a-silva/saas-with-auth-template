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
 * Interface para cache de permissões do usuário
 */
interface UserPermissionsCache {
  permissions: PrismaPermission[];
  cachedAt: number;
  expiresAt: number;
}

/**
 * Factory responsável pela criação de abilities CASL para usuários
 * Combina permissões baseadas em roles com permissões específicas do banco de dados
 * Implementa cache em memória para otimizar performance
 */
@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);
  private readonly permissionsCache = new Map<string, UserPermissionsCache>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
  private readonly CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

  constructor(private readonly permissionsService: PermissionsService) {
    // Configurar limpeza automática do cache
    setInterval(() => {
      this.cleanupExpiredCache();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Cria uma instância de Ability personalizada para um usuário específico
   * Combina permissões baseadas em roles (ADMIN, EDITOR, USER) com permissões
   * específicas armazenadas no banco de dados com cache em memória
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

    // --- Permissões Baseadas em Políticas do Banco de Dados (com Cache) ---
    try {
      const dbPermissions = await this.getUserPermissionsWithCache(user.id);

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

  /**
   * Busca permissões do usuário com cache em memória
   * @param userId - ID do usuário
   * @returns Lista de permissões específicas do usuário
   * @private
   */
  private async getUserPermissionsWithCache(
    userId: string,
  ): Promise<PrismaPermission[]> {
    const now = Date.now();
    const cached = this.permissionsCache.get(userId);

    // Verificar se existe cache válido
    if (cached && now < cached.expiresAt) {
      this.logger.debug('Permissões obtidas do cache', {
        userId,
        cacheAge: now - cached.cachedAt,
        permissionsCount: cached.permissions.length,
      });
      return cached.permissions;
    }

    // Buscar do banco e atualizar cache
    this.logger.debug('Buscando permissões do banco (cache miss)', { userId });
    const permissions =
      await this.permissionsService.findUserPermissions(userId);

    // Armazenar no cache
    this.permissionsCache.set(userId, {
      permissions,
      cachedAt: now,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    this.logger.debug('Permissões armazenadas no cache', {
      userId,
      permissionsCount: permissions.length,
      ttlMs: this.CACHE_TTL_MS,
    });

    return permissions;
  }

  /**
   * Invalida cache de permissões de um usuário específico
   * Útil quando permissões são atualizadas
   * @param userId - ID do usuário
   */
  invalidateUserCache(userId: string): void {
    if (this.permissionsCache.has(userId)) {
      this.permissionsCache.delete(userId);
      this.logger.debug('Cache de permissões invalidado', { userId });
    }
  }

  /**
   * Invalida todo o cache de permissões
   * Útil para limpeza global ou em caso de atualizações em massa
   */
  invalidateAllCache(): void {
    const cacheSize = this.permissionsCache.size;
    this.permissionsCache.clear();
    this.logger.log('Todo o cache de permissões foi invalidado', {
      previousCacheSize: cacheSize,
    });
  }

  /**
   * Remove entradas expiradas do cache
   * Executado automaticamente em intervalos regulares
   * @private
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, cached] of this.permissionsCache.entries()) {
      if (now >= cached.expiresAt) {
        this.permissionsCache.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('Cache cleanup executado', {
        cleanedEntries: cleanedCount,
        remainingEntries: this.permissionsCache.size,
      });
    }
  }

  /**
   * Retorna estatísticas do cache para monitoramento
   * @returns Estatísticas do cache de permissões
   */
  getCacheStats(): {
    size: number;
    ttlMs: number;
    cleanupIntervalMs: number;
  } {
    return {
      size: this.permissionsCache.size,
      ttlMs: this.CACHE_TTL_MS,
      cleanupIntervalMs: this.CLEANUP_INTERVAL_MS,
    };
  }
}
