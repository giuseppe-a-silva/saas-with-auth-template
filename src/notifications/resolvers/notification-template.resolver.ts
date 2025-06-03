import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationChannel } from '../interfaces/notification-dispatcher.interface';
import { NotificationTemplateService } from '../services/notification-template.service';
import { TemplateRendererService } from '../services/template-renderer.service';
import { NotificationCategory } from '../types/notification.types';

/**
 * Interface básica para usuário (mock até auth module estar disponível)
 */
interface User {
  id: string;
  email: string;
}

/**
 * Mock decorator para CurrentUser até auth module estar disponível
 */
function CurrentUser(): (
  target: unknown,
  propertyKey: string | symbol,
  parameterIndex: number,
) => void {
  return () => {
    // Mock implementation
  };
}

/**
 * Resolver GraphQL para templates de notificação
 * Expõe operações CRUD e funcionalidades relacionadas
 */
@Resolver(() => NotificationTemplate)
export class NotificationTemplateResolver {
  constructor(
    private readonly templateService: NotificationTemplateService,
    private readonly rendererService: TemplateRendererService,
  ) {}

  /**
   * Cria um novo template de notificação
   * @param createTemplateDto Dados do template
   * @param user Usuário autenticado
   * @returns Template criado
   */
  @Mutation(() => NotificationTemplate, {
    description: 'Cria um novo template de notificação',
  })
  async createNotificationTemplate(
    @Args('input') createTemplateDto: CreateTemplateDto,
    @CurrentUser()
    user: User = { id: 'system-user', email: 'system@example.com' },
  ): Promise<NotificationTemplate> {
    const templateData = {
      name: createTemplateDto.name,
      title: createTemplateDto.title,
      content: createTemplateDto.content,
      category: createTemplateDto.category,
      channel: createTemplateDto.channel,
      isActive: createTemplateDto.isActive,
    };

    const template = await this.templateService.createTemplate(
      templateData,
      user.id,
    );
    return template as NotificationTemplate;
  }

  /**
   * Lista todos os templates com filtros opcionais
   * @param category Filtro por categoria
   * @param channel Filtro por canal
   * @param isActive Filtro por status ativo
   * @param search Busca por nome ou título
   * @returns Lista de templates
   */
  @Query(() => [NotificationTemplate], {
    description: 'Lista templates de notificação com filtros opcionais',
  })
  async notificationTemplates(
    @Args('category', { nullable: true }) category?: NotificationCategory,
    @Args('channel', { nullable: true }) channel?: NotificationChannel,
    @Args('isActive', { nullable: true }) isActive?: boolean,
    @Args('search', { nullable: true }) search?: string,
  ): Promise<NotificationTemplate[]> {
    const templates = await this.templateService.listTemplates({
      category,
      channel,
      isActive,
      search,
    });
    return templates as NotificationTemplate[];
  }

  /**
   * Busca um template específico pelo nome
   * @param name Nome do template
   * @returns Template encontrado
   */
  @Query(() => NotificationTemplate, {
    description: 'Busca template por nome',
  })
  async notificationTemplateByName(
    @Args('name') name: string,
  ): Promise<NotificationTemplate> {
    const template = await this.templateService.findTemplateByName(name);
    return template as NotificationTemplate;
  }

  /**
   * Cria preview de um template com dados de exemplo
   * @param templateName Nome do template
   * @param sampleData Dados de exemplo em JSON
   * @returns Conteúdo renderizado
   */
  @Query(() => String, {
    description: 'Gera preview de template com dados de exemplo',
  })
  async previewNotificationTemplate(
    @Args('templateName') templateName: string,
    @Args('sampleData', { nullable: true }) sampleData?: string,
  ): Promise<string> {
    const template =
      await this.templateService.findTemplateByName(templateName);

    let parsedSampleData: Record<string, unknown> | undefined;

    if (sampleData) {
      try {
        const parsed: unknown = JSON.parse(sampleData);
        parsedSampleData =
          typeof parsed === 'object' && parsed !== null
            ? (parsed as Record<string, unknown>)
            : undefined;
      } catch (_error) {
        throw new Error('sampleData deve ser um JSON válido');
      }
    }

    return await this.rendererService.createTemplatePreview(
      template.content,
      parsedSampleData,
    );
  }

  /**
   * Valida sintaxe de um template
   * @param content Conteúdo do template
   * @returns true se válido
   */
  @Query(() => Boolean, {
    description: 'Valida sintaxe LiquidJS de um template',
  })
  validateTemplateContent(@Args('content') content: string): boolean {
    const validationResult = this.rendererService.validateTemplate(content);
    return validationResult.isValid;
  }

  /**
   * Extrai variáveis utilizadas em um template
   * @param content Conteúdo do template
   * @returns Array com nomes das variáveis
   */
  @Query(() => [String], {
    description: 'Extrai variáveis de um template',
  })
  extractTemplateVariables(@Args('content') content: string): string[] {
    return this.rendererService.extractTemplateVariables(content);
  }
}
