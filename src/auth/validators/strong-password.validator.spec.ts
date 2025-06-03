import { Test, TestingModule } from '@nestjs/testing';
import { ValidationArguments } from 'class-validator';
import {
  PasswordService,
  PasswordValidationResult,
} from '../services/password.service';
import { IsStrongPasswordConstraint } from './strong-password.validator';

describe('IsStrongPasswordConstraint', () => {
  let validator: IsStrongPasswordConstraint;
  let passwordService: jest.Mocked<PasswordService>;

  beforeEach(async () => {
    const mockPasswordService = {
      validatePasswordStrength: jest.fn().mockReturnValue({
        isValid: false,
        errors: ['Default mock error'],
        strength: 'weak',
        score: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsStrongPasswordConstraint,
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
      ],
    }).compile();

    validator = module.get<IsStrongPasswordConstraint>(
      IsStrongPasswordConstraint,
    );
    passwordService = module.get(PasswordService);
  });

  describe('validate', () => {
    it('should return false for null values', () => {
      const result = validator.validate(null as any, {} as ValidationArguments);

      expect(result).toBe(false);
      expect(passwordService.validatePasswordStrength).not.toHaveBeenCalled();
    });

    it('should return false for undefined values', () => {
      const result = validator.validate(
        undefined as any,
        {} as ValidationArguments,
      );

      expect(result).toBe(false);
      expect(passwordService.validatePasswordStrength).not.toHaveBeenCalled();
    });

    it('should return false for empty strings', () => {
      const result = validator.validate('', {} as ValidationArguments);

      expect(result).toBe(false);
      expect(passwordService.validatePasswordStrength).not.toHaveBeenCalled();
    });

    it('should return false for non-string values', () => {
      const nonStringValues = [123, {}, [], true, false];

      nonStringValues.forEach((value) => {
        const result = validator.validate(
          value as any,
          {} as ValidationArguments,
        );

        expect(result).toBe(false);
      });

      expect(passwordService.validatePasswordStrength).not.toHaveBeenCalled();
    });

    it('should return true when PasswordService validates password as strong', () => {
      const strongPassword = 'StrongPass123!@#';
      const mockValidationResult: PasswordValidationResult = {
        isValid: true,
        errors: [],
        strength: 'very-strong',
        score: 85,
      };

      passwordService.validatePasswordStrength.mockReturnValue(
        mockValidationResult,
      );

      const result = validator.validate(
        strongPassword,
        {} as ValidationArguments,
      );

      expect(result).toBe(true);
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
        strongPassword,
      );
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledTimes(1);
    });

    it('should return false when PasswordService validates password as weak', () => {
      const weakPassword = '123';
      const mockValidationResult: PasswordValidationResult = {
        isValid: false,
        errors: [
          'A senha deve ter pelo menos 12 caracteres',
          'A senha deve conter pelo menos 1 letra maiúscula',
          'A senha deve conter pelo menos 1 letra minúscula',
        ],
        strength: 'weak',
        score: 10,
      };

      passwordService.validatePasswordStrength.mockReturnValue(
        mockValidationResult,
      );

      const result = validator.validate(
        weakPassword,
        {} as ValidationArguments,
      );

      expect(result).toBe(false);
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
        weakPassword,
      );
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledTimes(1);
    });

    it('should handle whitespace-only strings', () => {
      const whitespaceStrings = ['   ', '\t', '\n', '\r\n', '    \t\n   '];

      whitespaceStrings.forEach((whitespace) => {
        const result = validator.validate(
          whitespace,
          {} as ValidationArguments,
        );

        expect(result).toBe(false);
        expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
          whitespace,
        );
      });
    });

    it('should call PasswordService for valid string inputs', () => {
      const testPasswords = [
        'short',
        'mediumLength',
        'VeryLongPasswordWithManyCharacters123!@#',
        'Password123',
        'simple123',
      ];

      testPasswords.forEach((password) => {
        const mockResult: PasswordValidationResult = {
          isValid: false,
          errors: ['Some error'],
          strength: 'weak',
          score: 20,
        };

        passwordService.validatePasswordStrength.mockReturnValue(mockResult);

        validator.validate(password, {} as ValidationArguments);

        expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
          password,
        );
      });

      expect(passwordService.validatePasswordStrength).toHaveBeenCalledTimes(
        testPasswords.length,
      );
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate message for null values', () => {
      const args = { value: null } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe('A senha deve ser uma string válida');
      expect(passwordService.validatePasswordStrength).not.toHaveBeenCalled();
    });

    it('should return appropriate message for undefined values', () => {
      const args = { value: undefined } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe('A senha deve ser uma string válida');
      expect(passwordService.validatePasswordStrength).not.toHaveBeenCalled();
    });

    it('should return appropriate message for non-string values', () => {
      const nonStringValues = [123, {}, [], true, false];

      nonStringValues.forEach((value) => {
        const args = { value } as ValidationArguments;
        const message = validator.defaultMessage(args);

        expect(message).toBe('A senha deve ser uma string válida');
      });

      expect(passwordService.validatePasswordStrength).not.toHaveBeenCalled();
    });

    it('should return specific error messages when password fails validation', () => {
      const weakPassword = 'weak';
      const mockValidationResult: PasswordValidationResult = {
        isValid: false,
        errors: [
          'A senha deve ter pelo menos 12 caracteres',
          'A senha deve conter pelo menos 1 número',
          'A senha deve conter pelo menos 1 letra maiúscula',
        ],
        strength: 'weak',
        score: 15,
      };

      passwordService.validatePasswordStrength.mockReturnValue(
        mockValidationResult,
      );

      const args = { value: weakPassword } as ValidationArguments;
      const message = validator.defaultMessage(args);

      const expectedMessage =
        'Senha não atende aos critérios de segurança: A senha deve ter pelo menos 12 caracteres, A senha deve conter pelo menos 1 número, A senha deve conter pelo menos 1 letra maiúscula';

      expect(message).toBe(expectedMessage);
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
        weakPassword,
      );
    });

    it('should return generic message when password is valid but message is called', () => {
      const strongPassword = 'StrongPassword123!@#';
      const mockValidationResult: PasswordValidationResult = {
        isValid: true,
        errors: [],
        strength: 'very-strong',
        score: 90,
      };

      passwordService.validatePasswordStrength.mockReturnValue(
        mockValidationResult,
      );

      const args = { value: strongPassword } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe(
        'A senha deve atender aos critérios mínimos de segurança',
      );
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
        strongPassword,
      );
    });

    it('should handle single error in validation result', () => {
      const password = 'test123';
      const mockValidationResult: PasswordValidationResult = {
        isValid: false,
        errors: ['A senha deve ter pelo menos 12 caracteres'],
        strength: 'weak',
        score: 25,
      };

      passwordService.validatePasswordStrength.mockReturnValue(
        mockValidationResult,
      );

      const args = { value: password } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe(
        'Senha não atende aos critérios de segurança: A senha deve ter pelo menos 12 caracteres',
      );
    });

    it('should handle empty errors array', () => {
      const password = 'testPassword';
      const mockValidationResult: PasswordValidationResult = {
        isValid: false,
        errors: [],
        strength: 'weak',
        score: 30,
      };

      passwordService.validatePasswordStrength.mockReturnValue(
        mockValidationResult,
      );

      const args = { value: password } as ValidationArguments;
      const message = validator.defaultMessage(args);

      expect(message).toBe(
        'A senha deve atender aos critérios mínimos de segurança',
      );
    });

    it('should handle whitespace-only strings in defaultMessage', () => {
      const whitespaceStrings = ['   ', '\t', '\n'];

      whitespaceStrings.forEach((whitespace) => {
        const args = { value: whitespace } as ValidationArguments;
        const message = validator.defaultMessage(args);

        expect(message).toBe(
          'Senha não atende aos critérios de segurança: Default mock error',
        );
        expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
          whitespace,
        );
      });
    });
  });

  describe('integration scenarios', () => {
    it('should properly integrate with different password strengths', () => {
      const testCases = [
        {
          password: '123',
          result: {
            isValid: false,
            errors: ['Too short'],
            strength: 'weak',
            score: 5,
          },
          expectedValid: false,
        },
        {
          password: 'Password123',
          result: {
            isValid: false,
            errors: ['Needs special char'],
            strength: 'medium',
            score: 45,
          },
          expectedValid: false,
        },
        {
          password: 'StrongPassword123!@#',
          result: {
            isValid: true,
            errors: [],
            strength: 'very-strong',
            score: 95,
          },
          expectedValid: true,
        },
      ];

      testCases.forEach(({ password, result, expectedValid }) => {
        passwordService.validatePasswordStrength.mockReturnValue(
          result as PasswordValidationResult,
        );

        const isValid = validator.validate(password, {} as ValidationArguments);

        expect(isValid).toBe(expectedValid);
        expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
          password,
        );
      });
    });

    it('should handle edge cases in password validation', () => {
      const edgeCases = [
        '',
        ' ',
        'a',
        'A'.repeat(100),
        '1'.repeat(50),
        'password',
        'PASSWORD',
        '12345678',
        'abcdefgh',
        'ABCDEFGH',
      ];

      edgeCases.forEach((password) => {
        passwordService.validatePasswordStrength.mockClear();

        if (password === '') {
          const isValid = validator.validate(
            password,
            {} as ValidationArguments,
          );
          expect(isValid).toBe(false);
          expect(
            passwordService.validatePasswordStrength,
          ).not.toHaveBeenCalled();
        } else {
          const mockResult: PasswordValidationResult = {
            isValid: false,
            errors: ['Test error'],
            strength: 'weak',
            score: 10,
          };

          passwordService.validatePasswordStrength.mockReturnValue(mockResult);

          const isValid = validator.validate(
            password,
            {} as ValidationArguments,
          );
          expect(isValid).toBe(false);
          expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
            password,
          );
        }
      });
    });
  });

  describe('dependency injection', () => {
    it('should properly inject PasswordService dependency', () => {
      expect(validator).toBeDefined();
      expect(passwordService).toBeDefined();
    });

    it('should use the injected PasswordService instance', () => {
      const testPassword = 'TestPassword123!';
      const mockResult: PasswordValidationResult = {
        isValid: true,
        errors: [],
        strength: 'strong',
        score: 75,
      };

      passwordService.validatePasswordStrength.mockReturnValue(mockResult);

      validator.validate(testPassword, {} as ValidationArguments);

      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
        testPassword,
      );
    });
  });
});
