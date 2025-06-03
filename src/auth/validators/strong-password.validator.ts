import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PasswordService } from '../services/password.service';

/**
 * Constraint personalizado para validação de senhas fortes
 * Utiliza o PasswordService para aplicar todas as regras de segurança
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
@Injectable()
export class IsStrongPasswordConstraint
  implements ValidatorConstraintInterface
{
  constructor(private readonly passwordService: PasswordService) {}

  /**
   * Valida se a senha atende aos critérios de segurança
   * @param value - Valor da senha a ser validada
   * @param _args - Argumentos de validação (não utilizados)
   * @returns true se senha é válida
   */
  validate(value: string, _args: ValidationArguments): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const validationResult =
      this.passwordService.validatePasswordStrength(value);
    return validationResult.isValid;
  }

  /**
   * Retorna mensagem de erro personalizada com detalhes específicos
   * @param args - Argumentos de validação
   * @returns Mensagem de erro detalhada
   */
  defaultMessage(args: ValidationArguments): string {
    const value = args.value as string;

    if (!value || typeof value !== 'string') {
      return 'A senha deve ser uma string válida';
    }

    const validationResult =
      this.passwordService.validatePasswordStrength(value);

    if (validationResult.errors.length > 0) {
      return `Senha não atende aos critérios de segurança: ${validationResult.errors.join(', ')}`;
    }

    return 'A senha deve atender aos critérios mínimos de segurança';
  }
}

/**
 * Decorator para validação de senha forte
 * Aplica todas as regras definidas no PasswordService
 *
 * Critérios aplicados:
 * - Mínimo 12 caracteres
 * - Pelo menos 4 letras (1 maiúscula + 1 minúscula)
 * - Pelo menos 1 número
 * - Não pode estar na blacklist de senhas comuns
 * - Não pode ter sequências óbvias (123, abc, etc.)
 * - Não pode ter muitos caracteres repetidos
 *
 * @param validationOptions - Opções adicionais de validação
 * @returns Decorator function
 */
export function IsStrongPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
