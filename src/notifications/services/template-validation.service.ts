import { Injectable, Logger } from '@nestjs/common';
import { Liquid } from 'liquidjs';

/**
 * Interface para resultado da validação
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  usedVariables: string[];
  availableVariables: string[];
}

/**
 * Interface para dados de template disponíveis
 */
export interface TemplateDataStructure extends Record<string, unknown> {
  eventKey: string;
  timestamp: string;
  data: Record<string, unknown>;
  user: {
    id: string;
    name: string;
    email: string;
    externalId?: string;
  };
  meta: Record<string, unknown>;
}

/**
 * Serviço responsável pela validação de templates de notificação
 * Verifica se as variáveis usadas no template existem nos dados disponíveis
 */
@Injectable()
export class TemplateValidationService {
  private readonly logger = new Logger(TemplateValidationService.name);
  private readonly liquidEngine: Liquid;

  constructor() {
    this.liquidEngine = new Liquid({
      strictFilters: false,
      strictVariables: false,
    });
  }

  /**
   * Valida um template verificando se as variáveis usadas existem
   * @param templateContent Conteúdo do template
   * @param eventKey Chave do evento para verificar dados específicos
   * @returns Resultado da validação
   */
  async validateTemplate(
    templateContent: string,
    eventKey: string,
  ): Promise<TemplateValidationResult> {
    this.logger.debug('Validando template', { eventKey });

    try {
      // 1. Extrair variáveis usadas no template
      const usedVariables = this.extractVariablesFromTemplate(templateContent);

      // 2. Obter estrutura de dados disponível para o eventKey
      const availableVariables = this.getAvailableVariables(eventKey);

      // 3. Verificar se variáveis usadas existem
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const variable of usedVariables) {
        if (!this.isVariableAvailable(variable, availableVariables)) {
          errors.push(
            `Variável '${variable}' não encontrada nos dados disponíveis`,
          );
        }
      }

      // 4. Validar sintaxe LiquidJS
      try {
        await this.liquidEngine.parseAndRender(
          templateContent,
          this.getSampleData(eventKey),
        );
      } catch (syntaxError) {
        const errorMessage =
          syntaxError instanceof Error
            ? syntaxError.message
            : 'Erro de sintaxe';
        errors.push(`Erro de sintaxe LiquidJS: ${errorMessage}`);
      }

      const isValid = errors.length === 0;

      this.logger.debug('Validação concluída', {
        eventKey,
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        usedVariablesCount: usedVariables.length,
      });

      return {
        isValid,
        errors,
        warnings,
        usedVariables,
        availableVariables: this.flattenVariableNames(availableVariables),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro durante validação do template', {
        error: errorMessage,
        eventKey,
      });

      return {
        isValid: false,
        errors: [`Erro interno durante validação: ${errorMessage}`],
        warnings: [],
        usedVariables: [],
        availableVariables: [],
      };
    }
  }

  /**
   * Extrai variáveis usadas no template
   * @param templateContent Conteúdo do template
   * @returns Lista de variáveis encontradas
   */
  private extractVariablesFromTemplate(templateContent: string): string[] {
    const variables = new Set<string>();

    // Regex para capturar variáveis LiquidJS: {{ variable }}, {{ object.property }}, etc.
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    let match;

    while ((match = variableRegex.exec(templateContent)) !== null) {
      const expression = match[1].trim();

      // Remove filtros (ex: variable | json -> variable)
      const variableWithoutFilters = expression.split('|')[0].trim();

      // Remove operadores e funções, mantém apenas a variável base
      const cleanVariable = variableWithoutFilters.split(/[\s()[\]]/)[0];

      if (
        cleanVariable &&
        !cleanVariable.includes('"') &&
        !cleanVariable.includes("'")
      ) {
        variables.add(cleanVariable);
      }
    }

    return Array.from(variables);
  }

  /**
   * Obtém estrutura de dados disponível para um eventKey específico
   * @param eventKey Chave do evento
   * @returns Estrutura de dados disponível
   */
  private getAvailableVariables(eventKey: string): TemplateDataStructure {
    const baseStructure: TemplateDataStructure = {
      eventKey,
      timestamp: '',
      data: this.getEventSpecificData(eventKey),
      user: {
        id: '',
        name: '',
        email: '',
        externalId: '',
      },
      meta: {},
    };

    return baseStructure;
  }

  /**
   * Obtém dados específicos por eventKey baseado no sistema atual
   * @param eventKey Chave do evento
   * @returns Dados específicos do evento
   */
  private getEventSpecificData(eventKey: string): Record<string, unknown> {
    const eventDataMap: Record<string, Record<string, unknown>> = {
      EMAIL_VERIFICATION: {
        userName: '',
        verificationUrl: '',
        supportUrl: '',
      },
      PASSWORD_RESET: {
        userName: '',
        resetUrl: '',
        expiresAt: '',
      },
      PASSWORD_CHANGED: {
        userName: '',
        changeDate: '',
        changeTime: '',
        ipAddress: '',
        device: '',
        securityUrl: '',
      },
      DATA_CHANGED: {
        userName: '',
        changeDate: '',
        changeTime: '',
        changes: [],
        ipAddress: '',
        device: '',
        securityUrl: '',
        supportUrl: '',
      },
    };

    return eventDataMap[eventKey] || {};
  }

  /**
   * Verifica se uma variável está disponível na estrutura de dados
   * @param variable Nome da variável
   * @param availableData Estrutura de dados disponível
   * @returns true se a variável existe
   */
  private isVariableAvailable(
    variable: string,
    availableData: TemplateDataStructure,
  ): boolean {
    // Verifica variáveis de primeiro nível
    if (variable in availableData) {
      return true;
    }

    // Verifica variáveis aninhadas (ex: user.name, data.userName)
    const parts = variable.split('.');
    if (parts.length > 1) {
      let current: Record<string, unknown> = availableData as Record<
        string,
        unknown
      >;

      for (const part of parts) {
        if (
          current &&
          typeof current === 'object' &&
          current !== null &&
          part in current
        ) {
          current = current[part] as Record<string, unknown>;
        } else {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Gera dados de exemplo para teste de sintaxe
   * @param eventKey Chave do evento
   * @returns Dados de exemplo
   */
  private getSampleData(eventKey: string): Record<string, unknown> {
    return {
      eventKey,
      timestamp: new Date().toISOString(),
      data: this.getEventSpecificData(eventKey),
      user: {
        id: 'test-user-id',
        name: 'Usuário Teste',
        email: 'teste@exemplo.com',
        externalId: 'ext-123',
      },
      meta: {
        origin: 'validation-test',
        requestId: 'test-request-id',
      },
    };
  }

  /**
   * Converte estrutura de dados em lista de nomes de variáveis
   * @param data Estrutura de dados
   * @param prefix Prefixo para variáveis aninhadas
   * @returns Lista de nomes de variáveis
   */
  private flattenVariableNames(
    data: Record<string, unknown>,
    prefix = '',
  ): string[] {
    const variables: string[] = [];

    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        variables.push(fullKey);

        const value = data[key];
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          variables.push(
            ...this.flattenVariableNames(
              value as Record<string, unknown>,
              fullKey,
            ),
          );
        }
      }
    }

    return variables;
  }

  /**
   * Obtém todas as eventKeys conhecidas pelo sistema
   * @returns Lista de eventKeys
   */
  getKnownEventKeys(): string[] {
    return [
      'EMAIL_VERIFICATION',
      'PASSWORD_RESET',
      'PASSWORD_CHANGED',
      'DATA_CHANGED',
    ];
  }
}
