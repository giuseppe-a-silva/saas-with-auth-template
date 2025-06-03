import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hashed = await service.hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(typeof hashed).toBe('string');
    });
  });

  describe('comparePassword', () => {
    it('should compare passwords correctly', async () => {
      const password = 'testPassword123';
      const hashed = await service.hashPassword(password);

      const isMatch = await service.comparePassword(password, hashed);
      expect(isMatch).toBe(true);

      const isWrongMatch = await service.comparePassword(
        'wrongPassword',
        hashed,
      );
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const strongPassword = 'Xk9mP@7qW$2vB!8u';
      const result = service.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(['strong', 'very-strong']).toContain(result.strength);
    });

    it('should reject weak password', () => {
      const weakPassword = '123';
      const result = service.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.strength).toBe('weak');
    });
  });

  // TODO: Adicionar mais testes específicos conforme necessário
  // - hasSequentialCharacters
  // - hasExcessiveRepeatedCharacters
  // - isPasswordInBlacklist
  // - generateSecurePassword
  // - addToBlacklist
});
