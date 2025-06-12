import {
  BadRequestException,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotificationChannel } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { CreateEventTemplateDto } from '../dto/create-event-template.dto';
import { TemplateFiltersDto } from '../dto/template-filters.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { EventNotificationTemplate } from '../entities/event-notification-template.entity';
import { TemplateManagerService } from '../services/template-manager.service';

/**
 * Resolver GraphQL para gerenciamento de templates de notificação
 * Fornece operações CRUD para templates baseados em eventos
 */
@Resolver(() => EventNotificationTemplate)
@UseGuards(JwtAuthGuard)
export class NotificationTemplateResolver {
  private readonly logger = new Logger(NotificationTemplateResolver.name);

  constructor(
    private readonly templateManagerService: TemplateManagerService,
  ) {}

  /**
   * Cria um novo template de notificação
   * @param createTemplateDto Dados do template a ser criado
   * @param currentUser Usuário autenticado
   * @returns Template criado
   */
  @Mutation(() => EventNotificationTemplate, {
    description: 'Cria um novo template de notificação',
  })
  async createNotificationTemplate(
    @Args('input') createTemplateDto: CreateEventTemplateDto,
    @CurrentUser() currentUser: User,
  ): Promise<EventNotificationTemplate> {
    this.logger.log('Criando template de notificação', {
      eventKey: createTemplateDto.eventKey,
      channel: createTemplateDto.channel,
      userId: currentUser.id,
    });

    try {
      // Verifica se já existe template para esta combinação eventKey + channel
      const existingTemplate = await this.templateManagerService.findTemplate(
        createTemplateDto.eventKey,
        createTemplateDto.channel,
      );

      if (existingTemplate) {
        throw new BadRequestException(
          `Já existe um template para o evento '${createTemplateDto.eventKey}' no canal '${createTemplateDto.channel}'`,
        );
      }

      const template = await this.templateManagerService.createTemplate({
        eventKey: createTemplateDto.eventKey,
        channel: createTemplateDto.channel,
        title: createTemplateDto.title,
        content: createTemplateDto.content,
        isActive: createTemplateDto.isActive ?? true,
        createdBy: currentUser.id,
      });

      this.logger.log('Template criado com sucesso', {
        templateId: template.id,
        eventKey: template.eventKey,
        channel: template.channel,
      });

      return template as EventNotificationTemplate;
    } catch (error) {
      this.logger.error('Erro ao criar template', {
        eventKey: createTemplateDto.eventKey,
        channel: createTemplateDto.channel,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Busca templates com filtros opcionais
   * @param filters Filtros para busca
   * @returns Lista de templates encontrados
   */
  @Query(() => [EventNotificationTemplate], {
    description: 'Busca templates de notificação com filtros opcionais',
  })
  async notificationTemplates(
    @Args('filters', { nullable: true }) filters?: TemplateFiltersDto,
  ): Promise<EventNotificationTemplate[]> {
    this.logger.log('Buscando templates', { filters });

    try {
      const templates = await this.templateManagerService.findTemplates(
        filters ?? {},
      );

      this.logger.log('Templates encontrados', {
        count: templates.length,
        filters,
      });

      return templates as EventNotificationTemplate[];
    } catch (error) {
      this.logger.error('Erro ao buscar templates', {
        filters,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Busca um template específico por eventKey e channel
   * @param eventKey Chave do evento
   * @param channel Canal de notificação
   * @returns Template encontrado
   */
  @Query(() => EventNotificationTemplate, {
    nullable: true,
    description: 'Busca um template específico por eventKey e channel',
  })
  async notificationTemplate(
    @Args('eventKey') eventKey: string,
    @Args('channel') channel: NotificationChannel,
  ): Promise<EventNotificationTemplate | null> {
    this.logger.log('Buscando template específico', { eventKey, channel });

    try {
      const template = await this.templateManagerService.findTemplate(
        eventKey,
        channel,
      );

      if (template) {
        this.logger.log('Template encontrado', {
          templateId: template.id,
          eventKey,
          channel,
        });
      } else {
        this.logger.log('Template não encontrado', { eventKey, channel });
      }

      return template as EventNotificationTemplate | null;
    } catch (error) {
      this.logger.error('Erro ao buscar template', {
        eventKey,
        channel,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Busca todos os templates de um evento específico
   * @param eventKey Chave do evento
   * @returns Lista de templates do evento
   */
  @Query(() => [EventNotificationTemplate], {
    description: 'Busca todos os templates de um evento específico',
  })
  async notificationTemplatesByEvent(
    @Args('eventKey') eventKey: string,
  ): Promise<EventNotificationTemplate[]> {
    this.logger.log('Buscando templates por evento', { eventKey });

    try {
      const templates =
        await this.templateManagerService.findTemplatesByEventKey(eventKey);

      this.logger.log('Templates encontrados por evento', {
        eventKey,
        count: templates.length,
      });

      return templates as EventNotificationTemplate[];
    } catch (error) {
      this.logger.error('Erro ao buscar templates por evento', {
        eventKey,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Atualiza um template existente
   * @param eventKey Chave do evento
   * @param channel Canal de notificação
   * @param updateTemplateDto Dados para atualização
   * @param currentUser Usuário autenticado
   * @returns Template atualizado
   */
  @Mutation(() => EventNotificationTemplate, {
    description: 'Atualiza um template de notificação existente',
  })
  async updateNotificationTemplate(
    @Args('eventKey') eventKey: string,
    @Args('channel') channel: NotificationChannel,
    @Args('input') updateTemplateDto: UpdateTemplateDto,
    @CurrentUser() currentUser: User,
  ): Promise<EventNotificationTemplate> {
    this.logger.log('Atualizando template', {
      eventKey,
      channel,
      userId: currentUser.id,
      updates: Object.keys(updateTemplateDto),
    });

    try {
      // Verifica se o template existe
      const existingTemplate = await this.templateManagerService.findTemplate(
        eventKey,
        channel,
      );

      if (!existingTemplate) {
        throw new NotFoundException(
          `Template não encontrado para evento '${eventKey}' no canal '${channel}'`,
        );
      }

      const updatedTemplate = await this.templateManagerService.updateTemplate(
        eventKey,
        channel,
        updateTemplateDto,
      );

      this.logger.log('Template atualizado com sucesso', {
        templateId: updatedTemplate.id,
        eventKey,
        channel,
      });

      return updatedTemplate as EventNotificationTemplate;
    } catch (error) {
      this.logger.error('Erro ao atualizar template', {
        eventKey,
        channel,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Remove um template específico
   * @param eventKey Chave do evento
   * @param channel Canal de notificação
   * @param currentUser Usuário autenticado
   * @returns Sucesso da operação
   */
  @Mutation(() => Boolean, {
    description: 'Remove um template de notificação específico',
  })
  async deleteNotificationTemplate(
    @Args('eventKey') eventKey: string,
    @Args('channel') channel: NotificationChannel,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.log('Removendo template', {
      eventKey,
      channel,
      userId: currentUser.id,
    });

    try {
      // Verifica se o template existe
      const existingTemplate = await this.templateManagerService.findTemplate(
        eventKey,
        channel,
      );

      if (!existingTemplate) {
        throw new NotFoundException(
          `Template não encontrado para evento '${eventKey}' no canal '${channel}'`,
        );
      }

      const success = await this.templateManagerService.deleteTemplate(
        eventKey,
        channel,
      );

      this.logger.log('Template removido', {
        eventKey,
        channel,
        success,
      });

      return success;
    } catch (error) {
      this.logger.error('Erro ao remover template', {
        eventKey,
        channel,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Alterna o status ativo de um template
   * @param eventKey Chave do evento
   * @param channel Canal de notificação
   * @param isActive Novo status ativo
   * @param currentUser Usuário autenticado
   * @returns Template atualizado
   */
  @Mutation(() => EventNotificationTemplate, {
    description: 'Alterna o status ativo de um template',
  })
  async toggleNotificationTemplateStatus(
    @Args('eventKey') eventKey: string,
    @Args('channel') channel: NotificationChannel,
    @Args('isActive') isActive: boolean,
    @CurrentUser() currentUser: User,
  ): Promise<EventNotificationTemplate> {
    this.logger.log('Alternando status do template', {
      eventKey,
      channel,
      isActive,
      userId: currentUser.id,
    });

    try {
      // Verifica se o template existe
      const existingTemplate = await this.templateManagerService.findTemplate(
        eventKey,
        channel,
      );

      if (!existingTemplate) {
        throw new NotFoundException(
          `Template não encontrado para evento '${eventKey}' no canal '${channel}'`,
        );
      }

      const updatedTemplate =
        await this.templateManagerService.toggleTemplateStatus(
          eventKey,
          channel,
          isActive,
        );

      this.logger.log('Status do template alterado', {
        templateId: updatedTemplate.id,
        eventKey,
        channel,
        isActive,
      });

      return updatedTemplate as EventNotificationTemplate;
    } catch (error) {
      this.logger.error('Erro ao alterar status do template', {
        eventKey,
        channel,
        isActive,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Lista todas as chaves de eventos que possuem templates
   * @returns Lista de chaves de eventos
   */
  @Query(() => [String], {
    description: 'Lista todas as chaves de eventos que possuem templates',
  })
  async eventKeysWithTemplates(): Promise<string[]> {
    this.logger.log('Buscando chaves de eventos com templates');

    try {
      const eventKeys =
        await this.templateManagerService.getEventKeysWithTemplates();

      this.logger.log('Chaves de eventos encontradas', {
        count: eventKeys.length,
      });

      return eventKeys;
    } catch (error) {
      this.logger.error('Erro ao buscar chaves de eventos', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }
}
