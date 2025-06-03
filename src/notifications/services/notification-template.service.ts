import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationTemplate as PrismaNotificationTemplate } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ERROR_MESSAGES } from '../constants/notification.constants';
import { NotificationChannel } from '../interfaces/notification-dispatcher.interface';
import { NotificationCategory } from '../types/notification.types';
import { TemplateRendererService } from './template-renderer.service';

/**
 * Interface para dados de criação de template
 */
interface CreateTemplateData {
  name: string;
  title: string;
  content: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  isActive?: boolean;
}

/**
 * Interface para dados de atualização de template
 */
interface UpdateTemplateData {
  title?: string;
  content?: string;
  category?: NotificationCategory;
  channel?: NotificationChannel;
  isActive?: boolean;
}

/**
 * Service responsável pelo gerenciamento de templates de notificação
 * Fornece operações CRUD e funcionalidades relacionadas
 */
@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  /**
   * Cria um novo template de notificação
   * @param templateData Dados do template
   * @param createdBy ID do usuário criador (opcional para templates de sistema)
   * @returns Template criado
   */
  async createTemplate(
    templateData: CreateTemplateData,
    createdBy?: string,
  ): Promise<PrismaNotificationTemplate> {
    try {
      // Valida sintaxe do template
      const validationResult = this.templateRenderer.validateTemplate(
        templateData.content,
      );

      if (!validationResult.isValid) {
        throw new Error(
          `Template possui sintaxe LiquidJS inválida: ${validationResult.error}`,
        );
      }

      this.logger.log('Criando novo template de notificação', {
        name: templateData.name,
        category: templateData.category,
        channel: templateData.channel,
        createdBy,
      });

      const template = await this.prisma.notificationTemplate.create({
        data: {
          name: templateData.name,
          title: templateData.title,
          content: templateData.content,
          category: templateData.category,
          channel: templateData.channel,
          isActive: templateData.isActive ?? true,
          createdBy,
        },
      });

      return template;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao criar template', {
        error: errorMessage,
        templateData,
      });
      throw error;
    }
  }

  /**
   * Busca um template pelo nome
   * @param name Nome do template
   * @returns Template encontrado
   */
  async findTemplateByName(name: string): Promise<PrismaNotificationTemplate> {
    try {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { name },
      });

      if (!template) {
        throw new NotFoundException(
          `${ERROR_MESSAGES.TEMPLATE_NOT_FOUND}: ${name}`,
        );
      }

      return template;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao buscar template por nome', {
        name,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Lista templates com filtros opcionais
   * @param filters Filtros de busca
   * @returns Lista de templates
   */
  async listTemplates(filters?: {
    category?: NotificationCategory;
    channel?: NotificationChannel;
    isActive?: boolean;
    search?: string;
  }): Promise<PrismaNotificationTemplate[]> {
    try {
      const where: Record<string, unknown> = {};

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.channel) {
        where.channel = filters.channel;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const templates = await this.prisma.notificationTemplate.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      return templates;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao listar templates', {
        error: errorMessage,
        filters,
      });
      throw error;
    }
  }

  /**
   * Atualiza um template existente
   * @param id ID do template
   * @param updateData Dados para atualização
   * @returns Template atualizado
   */
  async updateTemplate(
    id: string,
    updateData: UpdateTemplateData,
  ): Promise<PrismaNotificationTemplate> {
    try {
      const template = await this.prisma.notificationTemplate.update({
        where: { id },
        data: {
          ...(updateData.title && { title: updateData.title }),
          ...(updateData.content && { content: updateData.content }),
          ...(updateData.category && { category: updateData.category }),
          ...(updateData.channel && { channel: updateData.channel }),
          ...(updateData.isActive !== undefined && {
            isActive: updateData.isActive,
          }),
        },
      });

      return template;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao atualizar template', {
        id,
        error: errorMessage,
      });
      throw error;
    }
  }
}
