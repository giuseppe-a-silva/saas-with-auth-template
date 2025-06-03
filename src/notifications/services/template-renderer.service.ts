import { Injectable, Logger } from '@nestjs/common';
import { Liquid } from 'liquidjs';
import { ERROR_MESSAGES } from '../constants/notification.constants';

/**
 * Service responsável pela renderização de templates usando LiquidJS
 * Suporta interpolação de variáveis e lógica condicional básica
 */
@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);
  private readonly liquidEngine: Liquid;

  constructor() {
    // Configura engine do LiquidJS
    this.liquidEngine = new Liquid({
      strictFilters: false,
      strictVariables: false,
      lenientIf: true,
    });

    this.logger.log('Template renderer inicializado com LiquidJS');
  }

  /**
   * Renderiza um template com dados fornecidos
   * @param templateContent Conteúdo do template
   * @param data Dados para interpolação
   * @returns Conteúdo renderizado
   */
  async renderTemplate(
    templateContent: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    try {
      this.logger.debug('Renderizando template', {
        templateLength: templateContent.length,
        hasData: Object.keys(data).length > 0,
      });

      const renderedContent: unknown = await this.liquidEngine.parseAndRender(
        templateContent,
        data,
      );

      const renderedStr =
        typeof renderedContent === 'string'
          ? renderedContent
          : String(renderedContent);

      this.logger.debug('Template renderizado com sucesso', {
        originalLength: templateContent.length,
        renderedLength: renderedStr.length,
      });

      return renderedStr;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao renderizar template', {
        templateContent: templateContent.substring(0, 200),
        error: errorMessage,
      });

      throw new Error(`${ERROR_MESSAGES.RENDERING_FAILED}: ${errorMessage}`);
    }
  }

  /**
   * Cria preview de um template com dados de exemplo
   * @param templateContent Conteúdo do template
   * @param sampleData Dados de exemplo
   * @returns Preview renderizado
   */
  async createTemplatePreview(
    templateContent: string,
    sampleData?: Record<string, unknown>,
  ): Promise<string> {
    try {
      const previewData = sampleData ?? this.generateSampleData();
      return this.renderTemplate(templateContent, previewData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao criar preview do template', {
        templateContent: templateContent.substring(0, 100),
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Extrai variáveis utilizadas em um template
   * @param templateContent Conteúdo do template
   * @returns Lista de variáveis encontradas
   */
  extractTemplateVariables(templateContent: string): string[] {
    try {
      // Regex para encontrar variáveis LiquidJS: {{ variavel }} ou {{ objeto.propriedade }}
      const variableRegex =
        /{{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*}}/g;
      const variables = new Set<string>();

      let match;
      while ((match = variableRegex.exec(templateContent)) !== null) {
        variables.add(match[1]);
      }

      // Regex para encontrar variáveis em loops: {% for item in items %}
      const forLoopRegex =
        /{%\s*for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*%}/g;
      while ((match = forLoopRegex.exec(templateContent)) !== null) {
        variables.add(match[2]); // Adiciona a coleção
      }

      // Regex para encontrar variáveis em condicionais: {% if variavel %}
      const ifRegex =
        /{%\s*if\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*%}/g;
      while ((match = ifRegex.exec(templateContent)) !== null) {
        variables.add(match[1]);
      }

      const result = Array.from(variables).sort();

      this.logger.debug('Variáveis extraídas do template', {
        templateLength: templateContent.length,
        variablesFound: result.length,
        variables: result,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao extrair variáveis do template', {
        templateContent: templateContent.substring(0, 100),
        error: errorMessage,
      });
      return [];
    }
  }

  /**
   * Valida se um template é sintaticamente correto
   * @param templateContent Conteúdo do template
   * @returns true se válido, false caso contrário
   */
  validateTemplate(templateContent: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      // Tenta fazer parse do template sem renderizar
      this.liquidEngine.parse(templateContent);

      this.logger.debug('Template validado com sucesso', {
        templateLength: templateContent.length,
      });

      return { isValid: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.debug('Template inválido', {
        templateContent: templateContent.substring(0, 100),
        error: errorMessage,
      });

      return {
        isValid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Gera dados de exemplo para preview
   * @returns Dados de exemplo estruturados
   */
  private generateSampleData(): Record<string, unknown> {
    return {
      user: {
        id: '12345',
        name: 'João Silva',
        email: 'joao.silva@exemplo.com',
        firstName: 'João',
        lastName: 'Silva',
      },
      data: {
        title: 'Título de Exemplo',
        message: 'Esta é uma mensagem de exemplo para preview do template.',
        url: 'https://exemplo.com',
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR'),
        items: [
          { name: 'Item 1', value: 'Valor 1' },
          { name: 'Item 2', value: 'Valor 2' },
          { name: 'Item 3', value: 'Valor 3' },
        ],
        count: 3,
        total: 150.99,
        isActive: true,
        metadata: {
          source: 'sistema',
          version: '1.0',
        },
      },
      meta: {
        origin: 'preview-generator',
        timestamp: new Date().toISOString(),
        requestId: 'preview-12345',
      },
    };
  }
}
