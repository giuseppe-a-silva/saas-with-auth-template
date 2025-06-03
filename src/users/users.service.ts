import { Injectable, Logger } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';

/**
 * Serviço responsável pelo gerenciamento de usuários
 * Fornece operações CRUD para a entidade User
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca um usuário pelo seu ID único
   * @param id - ID único do usuário
   * @returns Dados completos do usuário ou null se não encontrado
   */
  async findOneById(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (user) {
        this.logger.log(`Usuário encontrado por ID: ${id}`);
      }
      return user;
    } catch (error) {
      this.logger.error(`Erro ao buscar usuário por ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca um usuário pelo seu email
   * @param email - Email do usuário
   * @returns Dados completos do usuário ou null se não encontrado
   */
  async findOneByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (user) {
        this.logger.log(`Usuário encontrado por email: ${email}`);
      }
      return user;
    } catch (error) {
      this.logger.error(`Erro ao buscar usuário por email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Busca um usuário pelo seu nome de usuário
   * @param username - Nome de usuário único
   * @returns Dados completos do usuário ou null se não encontrado
   */
  async findOneByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({ where: { username } });
      if (user) {
        this.logger.log(`Usuário encontrado por username: ${username}`);
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar usuário por username ${username}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Cria um novo usuário no sistema
   * A senha é automaticamente hasheada antes de ser armazenada
   * @param data - Dados para criação do usuário
   * @returns Dados completos do usuário criado
   * @throws {Error} Se houver erro na criação ou se email/username já existirem
   */
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      // Garante que a senha seja hasheada antes de salvar
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      const newUser = await this.prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      });

      this.logger.log(
        `Novo usuário criado: ${newUser.email} (ID: ${newUser.id})`,
      );
      return newUser;
    } catch (error) {
      this.logger.error(`Erro ao criar usuário:`, error);
      throw error;
    }
  }

  /**
   * Atualiza os dados de um usuário existente
   * Se a senha for fornecida, ela será automaticamente hasheada
   * @param params - Parâmetros contendo condições de busca e dados para atualização
   * @param params.where - Condições para identificar o usuário a ser atualizado
   * @param params.data - Dados a serem atualizados
   * @returns Dados completos do usuário atualizado
   * @throws {Error} Se o usuário não for encontrado ou houver erro na atualização
   */
  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;

    try {
      // Se a senha for atualizada, hasheia a nova senha
      if (typeof data.password === 'string') {
        const saltRounds = 10;
        data.password = await bcrypt.hash(data.password, saltRounds);
      }

      const updatedUser = await this.prisma.user.update({
        data,
        where,
      });

      this.logger.log(
        `Usuário atualizado: ${updatedUser.email} (ID: ${updatedUser.id})`,
      );
      return updatedUser;
    } catch (error) {
      this.logger.error(`Erro ao atualizar usuário:`, error);
      throw error;
    }
  }

  /**
   * Remove um usuário do sistema
   * @param where - Condições para identificar o usuário a ser removido
   * @returns Dados do usuário removido
   * @throws {Error} Se o usuário não for encontrado ou houver erro na remoção
   */
  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    try {
      const deletedUser = await this.prisma.user.delete({ where });

      this.logger.log(
        `Usuário removido: ${deletedUser.email} (ID: ${deletedUser.id})`,
      );
      return deletedUser;
    } catch (error) {
      this.logger.error(`Erro ao remover usuário:`, error);
      throw error;
    }
  }
}
