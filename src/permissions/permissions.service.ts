import { Injectable, Logger } from '@nestjs/common';
import { Permission, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

/**
 * Serviço responsável pelo gerenciamento de permissões de usuários
 * Fornece operações CRUD para permissões específicas no sistema CASL
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca todas as permissões específicas de um usuário
   * Utilizado pelo CASL para construir as abilities do usuário
   * @param userId - ID único do usuário
   * @returns Lista de permissões específicas do usuário
   */
  async findUserPermissions(userId: string): Promise<Permission[]> {
    this.logger.debug('Iniciando busca de permissões do usuário', { userId });

    try {
      const permissions = await this.prisma.permission.findMany({
        where: { userId },
      });

      this.logger.log('Permissões do usuário encontradas com sucesso', {
        userId,
        permissionsCount: permissions.length,
      });

      return permissions;
    } catch (error) {
      this.logger.error('Erro ao buscar permissões do usuário', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Cria uma nova permissão específica para um usuário
   * Permite definir permissões granulares além das baseadas em roles
   * @param data - Dados da permissão a ser criada
   * @returns Permissão criada
   * @throws {Error} Se houver erro na criação
   */
  async createPermission(
    data: Prisma.PermissionCreateInput,
  ): Promise<Permission> {
    this.logger.debug('Iniciando criação de permissão', {
      action: data.action,
      subject: data.subject,
      inverted: data.inverted,
    });

    try {
      const permission = await this.prisma.permission.create({ data });

      this.logger.log('Permissão criada com sucesso', {
        permissionId: permission.id,
        userId: permission.userId,
        action: permission.action,
        subject: permission.subject,
      });

      return permission;
    } catch (error) {
      this.logger.error('Erro ao criar permissão', {
        action: data.action,
        subject: data.subject,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Métodos futuros: updatePermission, deletePermission, findByActionAndSubject, etc.
}
