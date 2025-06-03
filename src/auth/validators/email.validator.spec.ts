import { ValidationArguments } from 'class-validator';
import { IsValidEmailConstraint } from './email.validator';

describe('IsValidEmailConstraint', () => {
  let validator: IsValidEmailConstraint;

  beforeEach(() => {
    validator = new IsValidEmailConstraint();
  });

  describe('validate', () => {
    // Casos válidos
    it('should validate correct email format', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'john.doe+filter@company.org',
        'user123@test-domain.com',
        'simple@test.co',
        'a@b.co',
        'user.name@example-domain.com',
        'test_email@domain.info',
      ];

      validEmails.forEach((email) => {
        expect(validator.validate(email, {} as ValidationArguments)).toBe(true);
      });
    });

    // Casos inválidos - valores nulos/undefined
    it('should reject null, undefined or non-string values', () => {
      const invalidValues = [null, undefined, '', 123, {}, [], true];

      invalidValues.forEach((value) => {
        expect(
          validator.validate(value as any, {} as ValidationArguments),
        ).toBe(false);
      });
    });

    // Casos inválidos - formato de email
    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user name@domain.com', // espaços
        'user@@domain.com',
        'user@domain@com',
        'user@.com', // falta nome do domínio
        'user@domain.', // termina com ponto
        'user@domain..com', // pontos duplos no domínio
      ];

      invalidEmails.forEach((email) => {
        expect(validator.validate(email, {} as ValidationArguments)).toBe(
          false,
        );
      });
    });

    // Casos inválidos - comprimento excessivo
    it('should reject emails longer than 320 characters', () => {
      // Criar um email com exatamente 321 caracteres
      const longLocalPart = 'a'.repeat(310); // 310 + '@domain.com' = 321
      const longEmail = `${longLocalPart}@domain.com`;

      expect(longEmail.length).toBeGreaterThan(320);
      expect(validator.validate(longEmail, {} as ValidationArguments)).toBe(
        false,
      );
    });

    // Casos inválidos - domínios descartáveis
    it('should reject disposable email domains', () => {
      const disposableEmails = [
        'user@10minutemail.com',
        'test@guerrillamail.com',
        'sample@mailinator.com',
        'temp@tempmail.org',
        'user@temp-mail.org',
        'test@yopmail.com',
        'sample@sharklasers.com',
        'user@grr.la',
        'test@throwaway.email',
        'sample@maildrop.cc',
      ];

      disposableEmails.forEach((email) => {
        expect(validator.validate(email, {} as ValidationArguments)).toBe(
          false,
        );
      });
    });

    // Casos inválidos - padrões suspeitos
    it('should reject emails with suspicious patterns', () => {
      const suspiciousEmails = [
        'user..name@domain.com', // pontos consecutivos
        '.user@domain.com', // começa com ponto
        'user.@domain.com', // termina com ponto
        'user++test@domain.com', // ++ consecutivos
        'user--test@domain.com', // -- consecutivos
        'user__test@domain.com', // __ consecutivos
      ];

      suspiciousEmails.forEach((email) => {
        expect(validator.validate(email, {} as ValidationArguments)).toBe(
          false,
        );
      });
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate message for null/undefined values', () => {
      const args = { value: null } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe('Email deve ser uma string válida');
    });

    it('should return appropriate message for non-string values', () => {
      const args = { value: 123 } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe('Email deve ser uma string válida');
    });

    it('should return appropriate message for emails that are too long', () => {
      const longEmail = 'a'.repeat(310) + '@domain.com'; // 310 + '@domain.com' = 321
      expect(longEmail.length).toBeGreaterThan(320);

      const args = { value: longEmail } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe('Email é muito longo (máximo 320 caracteres)');
    });

    it('should return appropriate message for disposable email domains', () => {
      const args = { value: 'test@mailinator.com' } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe(
        'Emails temporários ou descartáveis não são permitidos',
      );
    });

    it('should return appropriate message for suspicious patterns', () => {
      const args = { value: 'user..name@domain.com' } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe('Email contém padrões suspeitos ou inválidos');
    });

    it('should return generic message for other invalid formats', () => {
      const args = { value: 'invalid-email' } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe(
        'Email deve ter um formato válido (exemplo: usuario@dominio.com)',
      );
    });
  });

  describe('hasSuspiciousPatterns (private method testing via validation)', () => {
    it('should detect consecutive dots', () => {
      expect(
        validator.validate('user..name@domain.com', {} as ValidationArguments),
      ).toBe(false);
    });

    it('should detect local part starting with dot', () => {
      expect(
        validator.validate('.user@domain.com', {} as ValidationArguments),
      ).toBe(false);
    });

    it('should detect local part ending with dot', () => {
      expect(
        validator.validate('user.@domain.com', {} as ValidationArguments),
      ).toBe(false);
    });

    it('should detect consecutive plus signs', () => {
      expect(
        validator.validate('user++test@domain.com', {} as ValidationArguments),
      ).toBe(false);
    });

    it('should detect consecutive hyphens', () => {
      expect(
        validator.validate('user--test@domain.com', {} as ValidationArguments),
      ).toBe(false);
    });

    it('should detect consecutive underscores', () => {
      expect(
        validator.validate('user__test@domain.com', {} as ValidationArguments),
      ).toBe(false);
    });

    it('should allow single special characters', () => {
      expect(
        validator.validate('user+test@domain.com', {} as ValidationArguments),
      ).toBe(true);
      expect(
        validator.validate('user-test@domain.com', {} as ValidationArguments),
      ).toBe(true);
      expect(
        validator.validate('user_test@domain.com', {} as ValidationArguments),
      ).toBe(true);
    });
  });

  describe('domain extraction and validation', () => {
    it('should correctly extract domain and validate against disposable list', () => {
      // Teste com domínio em maiúscula (deve ser convertido para minúscula)
      expect(
        validator.validate('test@MAILINATOR.COM', {} as ValidationArguments),
      ).toBe(false);

      // Teste com domínio misto (deve ser convertido para minúscula)
      expect(
        validator.validate('test@TempMail.ORG', {} as ValidationArguments),
      ).toBe(false);
    });

    it('should handle emails without domain correctly', () => {
      // Emails malformados sem @ ou sem domínio
      expect(
        validator.validate('useremail.com', {} as ValidationArguments),
      ).toBe(false);
      expect(validator.validate('user@', {} as ValidationArguments)).toBe(
        false,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(validator.validate('', {} as ValidationArguments)).toBe(false);
    });

    it('should handle whitespace strings', () => {
      expect(validator.validate('   ', {} as ValidationArguments)).toBe(false);
      expect(validator.validate('\t', {} as ValidationArguments)).toBe(false);
      expect(validator.validate('\n', {} as ValidationArguments)).toBe(false);
    });

    it('should handle emails at RFC maximum length (320 chars)', () => {
      // Criando um email exatamente com 321 caracteres (inválido)
      const longEmail = 'a'.repeat(310) + '@domain.com'; // 310 + '@domain.com' = 321

      // Verifica se tem mais de 320 caracteres
      expect(longEmail.length).toBeGreaterThan(320);

      // Deve ser rejeitado porque é muito longo
      expect(validator.validate(longEmail, {} as ValidationArguments)).toBe(
        false,
      );
    });

    it('should handle emails just over maximum length', () => {
      const longEmail = 'a'.repeat(250) + '@' + 'b'.repeat(80) + '.com';
      expect(longEmail.length).toBeGreaterThan(320);
      expect(validator.validate(longEmail, {} as ValidationArguments)).toBe(
        false,
      );
    });
  });
});
