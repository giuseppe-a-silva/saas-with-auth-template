import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuditActionType, Prisma, User as PrismaUser } from '@prisma/client'; // Importa PrismaUser
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CheckPermissions } from '../../casl/decorators/check-permissions.decorator';
import { CaslGuard } from '../../casl/guards/casl.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { Action } from '../../permissions/entities/permission.entity';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User as UserEntity } from '../entities/user.entity'; // Corrigindo caminho do import
import { UsersService } from '../users.service';

/**
 * Resolver GraphQL responsável pelas operações de gerenciamento de usuários
 * Fornece queries e mutations para buscar, atualizar e deletar usuários
 */
@Resolver(() => UserEntity)
@UseGuards(JwtAuthGuard) // Protege todas as queries/mutations deste resolver por padrão
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retorna os dados do usuário atualmente autenticado
   * Utiliza informações do token JWT para identificar o usuário
   * @param user - Usuário extraído do token JWT pelo JwtAuthGuard
   * @returns Dados completos do usuário logado (sem senha)
   * @example
   * ```graphql
   * query {
   *   me {
   *     id
   *     email
   *     username
   *     role
   *     createdAt
   *     updatedAt
   *   }
   * }
   * ```
   */
  // Query para buscar o usuário logado (requer autenticação)
  @Query(() => UserEntity, {
    description: 'Retorna os dados do usuário autenticado atualmente.',
  })
  me(@CurrentUser() user: PrismaUser): UserEntity {
    // O decorator @CurrentUser injeta o usuário validado pelo JwtAuthGuard
    // Retorna o usuário (já sem senha, pois o guard/strategy não retorna)
    // A entidade GraphQL UserEntity garante que a senha não seja exposta.
    // Não é necessário await aqui, pois apenas retorna o usuário já disponível.
    return user as UserEntity; // Faz o cast para a entidade GraphQL
  }

  /**
   * Busca um usuário específico pelo seu ID único
   * Requer permissão de leitura para acessar dados de outros usuários
   * @param id - ID único do usuário a ser buscado
   * @returns Dados do usuário encontrado ou null se não existir
   * @throws {ForbiddenException} Se o usuário não tiver permissão de leitura
   * @example
   * ```graphql
   * query {
   *   findUserById(id: "user-id-123") {
   *     id
   *     email
   *     username
   *     role
   *   }
   * }
   * ```
   */
  // Query para buscar um usuário por ID (requer permissão de leitura)
  @Query(() => UserEntity, {
    nullable: true,
    description: 'Busca um usuário pelo seu ID.',
  })
  @UseGuards(CaslGuard)
  @CheckPermissions({ action: Action.Read, subject: 'User' })
  async findUserById(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<UserEntity | null> {
    const user = await this.usersService.findOneById(id);
    return user as UserEntity | null; // Cast para entidade GraphQL
  }

  /**
   * Atualiza o perfil do usuário atualmente autenticado
   * Permite alterar email, username e senha do próprio usuário
   * @param currentUser - Usuário extraído do token JWT
   * @param updateUserInput - Dados a serem atualizados (campos opcionais)
   * @returns Dados atualizados do usuário
   * @throws {ConflictException} Se email ou username já existirem
   * @example
   * ```graphql
   * mutation {
   *   updateMyProfile(updateUserInput: {
   *     email: "novoemail@example.com",
   *     username: "novousername"
   *   }) {
   *     id
   *     email
   *     username
   *     updatedAt
   *   }
   * }
   * ```
   */
  // Mutação para atualizar o próprio perfil (requer autenticação)
  @Audit(AuditActionType.DATA_UPDATE, {
    includeRequestBody: true,
    sensitiveFields: ['password'],
  })
  @Mutation(() => UserEntity, {
    description: 'Atualiza o perfil do usuário autenticado.',
  })
  async updateMyProfile(
    @CurrentUser() currentUser: PrismaUser,
    @Args('updateUserInput') updateUserInput: UpdateUserDto,
  ): Promise<UserEntity> {
    // O ID do usuário a ser atualizado é o do usuário logado
    const userIdToUpdate = currentUser.id;
    // Remove campos indefinidos do input para evitar sobrescrever com null
    const dataToUpdate: Partial<Prisma.UserUpdateInput> = {};
    if (updateUserInput.email) dataToUpdate.email = updateUserInput.email;
    if (updateUserInput.username)
      dataToUpdate.username = updateUserInput.username;
    if (updateUserInput.password)
      dataToUpdate.password = updateUserInput.password; // O service fará o hash

    if (Object.keys(dataToUpdate).length === 0) {
      // Se não há dados para atualizar, retorna o usuário atual
      return currentUser as UserEntity;
    }

    const updatedUser = await this.usersService.updateUser({
      where: { id: userIdToUpdate },
      data: dataToUpdate,
    });
    return updatedUser as UserEntity; // Cast para entidade GraphQL
  }

  /**
   * Remove um usuário do sistema (operação administrativa)
   * Requer permissão de delete e impede auto-deleção
   * @param id - ID do usuário a ser removido
   * @param currentUser - Usuário atualmente autenticado
   * @returns Dados do usuário removido
   * @throws {ForbiddenException} Se tentar deletar a própria conta ou sem permissão
   * @example
   * ```graphql
   * mutation {
   *   deleteUser(id: "user-id-123") {
   *     id
   *     email
   *     username
   *   }
   * }
   * ```
   */
  // Mutação para deletar um usuário (requer permissão de delete)
  @Audit(AuditActionType.DATA_UPDATE, {
    includeRequestBody: true,
  })
  @Mutation(() => UserEntity, {
    description: 'Deleta um usuário do sistema (requer permissão).',
  })
  @UseGuards(CaslGuard)
  @CheckPermissions({ action: Action.Delete, subject: 'User' })
  async deleteUser(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: PrismaUser, // Pega o usuário logado para evitar auto-deleção
  ): Promise<UserEntity> {
    // Impede que o usuário delete a si mesmo
    if (id === currentUser.id) {
      throw new ForbiddenException('Você não pode deletar sua própria conta.');
    }
    const deletedUser = await this.usersService.deleteUser({ id });
    return deletedUser as UserEntity; // Cast para entidade GraphQL
  }
}
