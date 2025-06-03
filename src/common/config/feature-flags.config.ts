import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuração de Feature Flags para controle de funcionalidades
 * Simplificado para MVP - mantém apenas flags essenciais
 */
@Injectable()
export class FeatureFlagsConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Feature flag para o sistema de auditoria
   * @returns true se a auditoria deve ser ativada
   */
  get enableAuditSystem(): boolean {
    return this.configService.get<boolean>('FEATURE_AUDIT_SYSTEM', true);
  }

  /**
   * Feature flag para validações robustas de senha
   * @returns true se as validações robustas devem ser aplicadas
   */
  get enableStrongPasswordValidation(): boolean {
    return this.configService.get<boolean>(
      'FEATURE_STRONG_PASSWORD_VALIDATION',
      true,
    );
  }

  /**
   * Retorna todas as feature flags ativas para debug
   * @returns objeto com todas as flags e seus valores
   */
  getAllFlags(): Record<string, boolean> {
    return {
      enableAuditSystem: this.enableAuditSystem,
      enableStrongPasswordValidation: this.enableStrongPasswordValidation,
    };
  }
}
