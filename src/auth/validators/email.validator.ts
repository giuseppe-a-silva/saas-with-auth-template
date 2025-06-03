import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Lista de domínios de email temporários/descartáveis para bloquear
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.org',
  'temp-mail.org',
  'yopmail.com',
  'sharklasers.com',
  'grr.la',
  'throwaway.email',
  'maildrop.cc',
];

/**
 * Constraint personalizado para validação robusta de email
 */
@ValidatorConstraint({ name: 'isValidEmail', async: false })
export class IsValidEmailConstraint implements ValidatorConstraintInterface {
  /**
   * Valida se o email atende aos critérios de segurança
   * @param value - Valor do email a ser validado
   * @param _args - Argumentos de validação (não utilizados)
   * @returns true se email é válido
   */
  validate(value: string, _args: ValidationArguments): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    // Regex robusta para validação de email
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(value)) {
      return false;
    }

    // Verifica comprimento máximo (320 caracteres é o limite RFC)
    if (value.length > 320) {
      return false;
    }

    // Verifica se não é um domínio descartável
    const domain = value.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      return false;
    }

    // Verifica se não tem caracteres consecutivos suspeitos
    if (this.hasSuspiciousPatterns(value)) {
      return false;
    }

    return true;
  }

  /**
   * Retorna mensagem de erro personalizada
   * @param args - Argumentos de validação
   * @returns Mensagem de erro específica
   */
  defaultMessage(args: ValidationArguments): string {
    const value = args.value as string;

    if (!value || typeof value !== 'string') {
      return 'Email deve ser uma string válida';
    }

    if (value.length > 320) {
      return 'Email é muito longo (máximo 320 caracteres)';
    }

    const domain = value.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      return 'Emails temporários ou descartáveis não são permitidos';
    }

    if (this.hasSuspiciousPatterns(value)) {
      return 'Email contém padrões suspeitos ou inválidos';
    }

    return 'Email deve ter um formato válido (exemplo: usuario@dominio.com)';
  }

  /**
   * Verifica se o email contém padrões suspeitos
   * @param email - Email a ser verificado
   * @returns true se contém padrões suspeitos
   * @private
   */
  private hasSuspiciousPatterns(email: string): boolean {
    // Verifica pontos consecutivos
    if (email.includes('..')) {
      return true;
    }

    // Verifica se começa ou termina com ponto
    const localPart = email.split('@')[0];
    if (localPart?.startsWith('.') || localPart?.endsWith('.')) {
      return true;
    }

    // Verifica caracteres especiais consecutivos suspeitos
    const suspiciousPatterns = [
      /\+\+/, // ++ consecutivos
      /--/, // -- consecutivos
      /__/, // __ consecutivos
      /\.\./, // .. consecutivos
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(email));
  }
}

/**
 * Decorator para validação robusta de email
 * Aplica validações de formato, segurança e anti-spam
 *
 * Critérios aplicados:
 * - Formato RFC 5322 completo
 * - Máximo 320 caracteres
 * - Bloqueia domínios descartáveis conhecidos
 * - Verifica padrões suspeitos
 * - Validação de caracteres especiais
 *
 * @param validationOptions - Opções adicionais de validação
 * @returns Decorator function
 */
export function IsValidEmail(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isValidEmail',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsValidEmailConstraint,
    });
  };
}
