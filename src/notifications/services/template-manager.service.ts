import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventNotificationTemplate, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  TemplateValidationResult,
  TemplateValidationService,
} from './template-validation.service';

/**
 * Interface para criação de template
 */
interface CreateTemplateInput {
  eventKey: string;
  channel: NotificationChannel;
  title: string;
  content: string;
  isActive?: boolean;
  createdBy?: string;
}

/**
 * Interface para atualização de template
 */
interface UpdateTemplateInput {
  title?: string;
  content?: string;
  isActive?: boolean;
}

/**
 * Interface para busca de templates
 */
interface FindTemplatesInput {
  eventKey?: string;
  channel?: NotificationChannel;
  isActive?: boolean;
}

/**
 * Serviço responsável pela gestão de templates de notificação por eventKey
 * Oferece operações CRUD para templates específicos de cada combinação eventKey + channel
 */
@Injectable()
export class TemplateManagerService {
  private readonly logger = new Logger(TemplateManagerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly templateValidationService: TemplateValidationService,
  ) {}

  /**
   * Cria um novo template para eventKey + channel
   * @param input Dados do template a ser criado
   * @returns Template criado
   * @throws BadRequestException se o template for inválido
   */
  async createTemplate(
    input: CreateTemplateInput,
  ): Promise<EventNotificationTemplate> {
    this.logger.log('Criando novo template', {
      eventKey: input.eventKey,
      channel: input.channel,
    });

    // Validar template antes de criar
    const validationResult =
      await this.templateValidationService.validateTemplate(
        input.content,
        input.eventKey,
      );

    if (!validationResult.isValid) {
      const errorMessage = `Template inválido: ${validationResult.errors.join(', ')}`;
      this.logger.error('Falha na validação do template', {
        eventKey: input.eventKey,
        channel: input.channel,
        errors: validationResult.errors,
        usedVariables: validationResult.usedVariables,
      });
      throw new BadRequestException(errorMessage);
    }

    this.logger.debug('Template validado com sucesso', {
      eventKey: input.eventKey,
      usedVariables: validationResult.usedVariables,
    });

    try {
      const template =
        await this.prismaService.eventNotificationTemplate.create({
          data: {
            eventKey: input.eventKey,
            channel: input.channel,
            title: input.title,
            content: input.content,
            isActive: input.isActive ?? true,
            createdBy: input.createdBy,
          },
        });

      this.logger.log('Template criado com sucesso', {
        id: template.id,
        eventKey: template.eventKey,
        channel: template.channel,
      });

      return template;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao criar template', {
        eventKey: input.eventKey,
        channel: input.channel,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Busca template específico por eventKey + channel
   * @param eventKey Chave do evento
   * @param channel Canal de notificação
   * @returns Template encontrado ou null
   */
  async findTemplate(
    eventKey: string,
    channel: NotificationChannel,
  ): Promise<EventNotificationTemplate | null> {
    this.logger.debug('Buscando template específico', {
      eventKey,
      channel,
    });

    return this.prismaService.eventNotificationTemplate.findUnique({
      where: {
        eventKey_channel: {
          eventKey,
          channel,
        },
      },
    });
  }

  /**
   * Busca todos os templates por eventKey (todos os canais)
   * @param eventKey Chave do evento
   * @returns Lista de templates do evento
   */
  async findTemplatesByEventKey(
    eventKey: string,
  ): Promise<EventNotificationTemplate[]> {
    this.logger.debug('Buscando templates por eventKey', {
      eventKey,
    });

    return this.prismaService.eventNotificationTemplate.findMany({
      where: {
        eventKey,
        isActive: true,
      },
      orderBy: {
        channel: 'asc',
      },
    });
  }

  /**
   * Busca templates com filtros flexíveis
   * @param filters Filtros para busca
   * @returns Lista de templates filtrados
   */
  async findTemplates(
    filters: FindTemplatesInput = {},
  ): Promise<EventNotificationTemplate[]> {
    this.logger.debug('Buscando templates com filtros', filters);

    const whereClause: {
      eventKey?: string;
      channel?: NotificationChannel;
      isActive?: boolean;
    } = {};

    if (filters.eventKey) {
      whereClause.eventKey = filters.eventKey;
    }

    if (filters.channel) {
      whereClause.channel = filters.channel;
    }

    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    return this.prismaService.eventNotificationTemplate.findMany({
      where: whereClause,
      orderBy: [{ eventKey: 'asc' }, { channel: 'asc' }],
    });
  }

  /**
   * Atualiza um template existente
   * @param eventKey Chave do evento
   * @param channel Canal de notificação
   * @param input Dados para atualização
   * @returns Template atualizado
   * @throws BadRequestException se o template atualizado for inválido
   */
  async updateTemplate(
    eventKey: string,
    channel: NotificationChannel,
    input: UpdateTemplateInput,
  ): Promise<EventNotificationTemplate> {
    this.logger.log('Atualizando template', {
      eventKey,
      channel,
      updates: Object.keys(input),
    });

    // Se está atualizando o conteúdo, validar
    if (input.content) {
      const validationResult =
        await this.templateValidationService.validateTemplate(
          input.content,
          eventKey,
        );

      if (!validationResult.isValid) {
        const errorMessage = `Template inválido: ${validationResult.errors.join(', ')}`;
        this.logger.error('Falha na validação do template atualizado', {
          eventKey,
          channel,
          errors: validationResult.errors,
          usedVariables: validationResult.usedVariables,
        });
        throw new BadRequestException(errorMessage);
      }

      this.logger.debug('Template atualizado validado com sucesso', {
        eventKey,
        usedVariables: validationResult.usedVariables,
      });
    }

    try {
      const template =
        await this.prismaService.eventNotificationTemplate.update({
          where: {
            eventKey_channel: {
              eventKey,
              channel,
            },
          },
          data: {
            ...input,
            updatedAt: new Date(),
          },
        });

      this.logger.log('Template atualizado com sucesso', {
        id: template.id,
        eventKey: template.eventKey,
        channel: template.channel,
      });

      return template;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao atualizar template', {
        eventKey,
        channel,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Remove um template específico
   * @param eventKey Chave do evento
   * @param channel Canal de notificação
   * @returns true se removido com sucesso
   */
  async deleteTemplate(
    eventKey: string,
    channel: NotificationChannel,
  ): Promise<boolean> {
    this.logger.log('Removendo template', {
      eventKey,
      channel,
    });

    try {
      await this.prismaService.eventNotificationTemplate.delete({
        where: {
          eventKey_channel: {
            eventKey,
            channel,
          },
        },
      });

      this.logger.log('Template removido com sucesso', {
        eventKey,
        channel,
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao remover template', {
        eventKey,
        channel,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Remove todos os templates de um eventKey
   * @param eventKey Chave do evento
   * @returns Número de templates removidos
   */
  async deleteTemplatesByEventKey(eventKey: string): Promise<number> {
    this.logger.log('Removendo todos os templates do eventKey', {
      eventKey,
    });

    try {
      const result =
        await this.prismaService.eventNotificationTemplate.deleteMany({
          where: {
            eventKey,
          },
        });

      this.logger.log('Templates removidos com sucesso', {
        eventKey,
        deletedCount: result.count,
      });

      return result.count;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao remover templates do eventKey', {
        eventKey,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Alterna o status ativo de um template
   * @param eventKey Chave do evento
   * @param channel Canal de notificação
   * @param isActive Novo status ativo
   * @returns Template atualizado
   */
  async toggleTemplateStatus(
    eventKey: string,
    channel: NotificationChannel,
    isActive: boolean,
  ): Promise<EventNotificationTemplate> {
    this.logger.log('Alternando status do template', {
      eventKey,
      channel,
      isActive,
    });

    return this.updateTemplate(eventKey, channel, {
      isActive,
    });
  }

  /**
   * Lista todos os eventKeys únicos que possuem templates
   * @returns Lista de eventKeys com templates
   */
  async getEventKeysWithTemplates(): Promise<string[]> {
    this.logger.debug('Buscando eventKeys com templates');

    const result = await this.prismaService.eventNotificationTemplate.findMany({
      select: {
        eventKey: true,
      },
      distinct: ['eventKey'],
      orderBy: {
        eventKey: 'asc',
      },
    });

    return result.map((item: { eventKey: string }) => item.eventKey);
  }

  /**
   * Conta templates por canal
   * @returns Objeto com contagem por canal
   */
  async getTemplateCountByChannel(): Promise<
    Record<NotificationChannel, number>
  > {
    this.logger.debug('Contando templates por canal');

    const counts = await this.prismaService.eventNotificationTemplate.groupBy({
      by: ['channel'],
      _count: {
        id: true,
      },
      where: {
        isActive: true,
      },
    });

    const result = {
      EMAIL: 0,
      PUSH: 0,
      REALTIME: 0,
    } as Record<NotificationChannel, number>;

    for (const count of counts) {
      result[count.channel] = count._count.id;
    }

    return result;
  }

  /**
   * Verifica se um eventKey possui templates para todos os canais
   * @param eventKey Chave do evento
   * @returns true se possui templates para todos os canais
   */
  async hasTemplatesForAllChannels(eventKey: string): Promise<boolean> {
    const availableChannels = Object.values(NotificationChannel);
    const templates = await this.findTemplatesByEventKey(eventKey);
    const templateChannels = templates.map((t) => t.channel);
    return availableChannels.every((channel) =>
      templateChannels.includes(channel),
    );
  }

  /**
   * Valida um template sem salvá-lo
   * @param content Conteúdo do template
   * @param eventKey Chave do evento
   * @returns Resultado da validação
   */
  async validateTemplate(
    content: string,
    eventKey: string,
  ): Promise<TemplateValidationResult> {
    this.logger.debug('Validando template', { eventKey });
    return this.templateValidationService.validateTemplate(content, eventKey);
  }
}
