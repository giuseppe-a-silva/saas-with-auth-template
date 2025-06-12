import { Logger } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  TemplateValidationResponse,
  ValidateTemplateDto,
} from '../dto/validate-template.dto';
import { TemplateManagerService } from '../services/template-manager.service';

/**
 * Resolver público para validação de templates
 * Não requer autenticação pois é apenas validação
 */
@Resolver()
export class TemplateValidationResolver {
  private readonly logger = new Logger(TemplateValidationResolver.name);

  constructor(
    private readonly templateManagerService: TemplateManagerService,
  ) {}

  /**
   * Valida um template sem salvá-lo (endpoint público)
   * @param validateTemplateDto Dados para validação
   * @returns Resultado da validação
   */
  @Mutation(() => TemplateValidationResponse, {
    description: 'Valida um template sem salvá-lo (endpoint público)',
  })
  async validateNotificationTemplate(
    @Args('input') validateTemplateDto: ValidateTemplateDto,
  ): Promise<TemplateValidationResponse> {
    this.logger.log('Validando template (público)', {
      eventKey: validateTemplateDto.eventKey,
    });

    try {
      const result = await this.templateManagerService.validateTemplate(
        validateTemplateDto.content,
        validateTemplateDto.eventKey,
      );

      this.logger.log('Validação de template concluída', {
        eventKey: validateTemplateDto.eventKey,
        isValid: result.isValid,
        errorsCount: result.errors.length,
      });

      return {
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        usedVariables: result.usedVariables,
        availableVariables: result.availableVariables,
      };
    } catch (error) {
      this.logger.error('Erro ao validar template', {
        eventKey: validateTemplateDto.eventKey,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }
}
