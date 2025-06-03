import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Lista de senhas comuns e fracas para blacklist
 * Baseada em senhas mais comuns usadas mundialmente
 */
const COMMON_PASSWORDS = [
  '123456',
  'password',
  '123456789',
  '12345678',
  '12345',
  '1234567',
  '1234567890',
  'qwerty',
  'abc123',
  'million2',
  '000000',
  '1234',
  'iloveyou',
  'aaron431',
  'password1',
  'qqww1122',
  '123',
  'omgpop',
  '123321',
  '654321',
  'senha',
  'admin',
  'administrador',
  'usuario',
  'user',
  'root',
  'toor',
  'teste',
  'test',
  'guest',
  'convidado',
  'welcome',
  'bemvindo',
  'login',
  'pass',
  'palavra',
  'secret',
  'segredo',
];

/**
 * Interface para resultado de validação de senha
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

/**
 * Serviço responsável pelo gerenciamento de senhas
 * Handles hash, validação de segurança e blacklist
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly saltRounds = 12;

  /**
   * Gera hash da senha usando bcrypt
   * @param plainPassword - Senha em texto plano
   * @returns Hash da senha
   */
  async hashPassword(plainPassword: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(plainPassword, this.saltRounds);
      this.logger.debug('Senha hasheada com sucesso');
      return hashedPassword;
    } catch (error) {
      this.logger.error('Erro ao fazer hash da senha:', error);
      throw new Error('Erro interno ao processar senha');
    }
  }

  /**
   * Compara senha em texto plano com hash
   * @param plainPassword - Senha em texto plano
   * @param hashedPassword - Hash da senha armazenado
   * @returns true se senhas coincidem
   */
  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      this.logger.debug(
        `Comparação de senha: ${isMatch ? 'sucesso' : 'falha'}`,
      );
      return isMatch;
    } catch (error) {
      this.logger.error('Erro ao comparar senhas:', error);
      return false;
    }
  }

  /**
   * Valida se a senha atende aos critérios de segurança
   * Critérios: mínimo 12 caracteres, 4 letras (1 maiúscula + 1 minúscula), números
   * @param password - Senha a ser validada
   * @returns Resultado da validação com detalhes
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Verifica comprimento mínimo (12 caracteres)
    if (password.length < 12) {
      errors.push('A senha deve ter no mínimo 12 caracteres');
    } else {
      score += 20;
      // Bonus por comprimento extra
      if (password.length >= 16) score += 10;
      if (password.length >= 20) score += 10;
    }

    // Conta tipos de caracteres
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Conta quantas letras tem
    const letterCount = (password.match(/[a-zA-Z]/g) ?? []).length;
    if (letterCount < 4) {
      errors.push('A senha deve ter no mínimo 4 letras');
    } else {
      score += 15;
    }

    // Verifica presença de maiúscula
    if (!hasUppercase) {
      errors.push('A senha deve ter pelo menos uma letra maiúscula');
    } else {
      score += 15;
    }

    // Verifica presença de minúscula
    if (!hasLowercase) {
      errors.push('A senha deve ter pelo menos uma letra minúscula');
    } else {
      score += 15;
    }

    // Verifica presença de números (obrigatório)
    if (!hasNumbers) {
      errors.push('A senha deve ter pelo menos um número');
    } else {
      score += 15;
    }

    // Caracteres especiais são opcionais, mas dão pontos extras
    if (hasSpecialChars) {
      score += 10;
    }

    // Verifica padrões comuns
    const hasSequentialChars = this.hasSequentialCharacters(password);
    if (hasSequentialChars) {
      errors.push('A senha não deve ter sequências óbvias (123, abc, etc.)');
      score -= 15;
    }

    // Verifica repetições excessivas
    const hasRepeatedChars = this.hasExcessiveRepeatedCharacters(password);
    if (hasRepeatedChars) {
      errors.push('A senha não deve ter muitos caracteres repetidos');
      score -= 10;
    }

    // Verifica blacklist
    if (this.isPasswordInBlacklist(password)) {
      errors.push('Esta senha é muito comum e não é segura');
      score = Math.min(score, 20); // Limita score máximo para senhas comuns
    }

    // Normaliza score entre 0-100
    score = Math.max(0, Math.min(100, score));

    // Determina força da senha
    let strength: PasswordValidationResult['strength'];
    if (score >= 80) strength = 'very-strong';
    else if (score >= 60) strength = 'strong';
    else if (score >= 40) strength = 'medium';
    else strength = 'weak';

    const isValid = errors.length === 0 && score >= 40;

    return {
      isValid,
      errors,
      strength,
      score,
    };
  }

  /**
   * Verifica se a senha contém caracteres sequenciais óbvios
   * @param password - Senha a ser verificada
   * @returns true se encontrar sequências óbvias
   * @private
   */
  private hasSequentialCharacters(password: string): boolean {
    const lowerPassword = password.toLowerCase();

    // Sequências numéricas
    const numSequences = [
      '0123',
      '1234',
      '2345',
      '3456',
      '4567',
      '5678',
      '6789',
    ];
    // Sequências alfabéticas
    const alphaSequences = [
      'abcd',
      'bcde',
      'cdef',
      'defg',
      'efgh',
      'fghi',
      'ghij',
    ];
    // Sequências de teclado
    const keyboardSequences = ['qwer', 'asdf', 'zxcv', 'qwerty', 'asdfgh'];

    const allSequences = [
      ...numSequences,
      ...alphaSequences,
      ...keyboardSequences,
    ];

    return allSequences.some(
      (seq) =>
        lowerPassword.includes(seq) ||
        lowerPassword.includes(seq.split('').reverse().join('')),
    );
  }

  /**
   * Verifica se a senha tem caracteres repetidos excessivamente
   * @param password - Senha a ser verificada
   * @returns true se tiver muitos caracteres repetidos
   * @private
   */
  private hasExcessiveRepeatedCharacters(password: string): boolean {
    // Verifica se algum caractere aparece mais de 3 vezes
    const charCount: Record<string, number> = {};

    for (const char of password) {
      charCount[char] = (charCount[char] ?? 0) + 1;
      if (charCount[char] > 3) {
        return true;
      }
    }

    // Verifica padrões repetitivos (aaa, 111, etc)
    const repeatedPatterns = /(.)\1{2,}/.test(password);
    return repeatedPatterns;
  }

  /**
   * Verifica se a senha está na blacklist de senhas comuns
   * @param password - Senha a ser verificada
   * @returns true se estiver na blacklist
   * @private
   */
  private isPasswordInBlacklist(password: string): boolean {
    const lowerPassword = password.toLowerCase();

    // Verifica se a senha é exatamente igual a uma da blacklist
    if (COMMON_PASSWORDS.includes(lowerPassword)) {
      return true;
    }

    // Verifica se a senha contém palavras comuns da blacklist
    const containsCommonWord = COMMON_PASSWORDS.some((commonPassword) => {
      // Ignora palavras muito pequenas para evitar falsos positivos
      if (commonPassword.length < 4) return false;
      return lowerPassword.includes(commonPassword);
    });

    return containsCommonWord;
  }

  /**
   * Gera uma senha segura automaticamente
   * @param length - Comprimento da senha (mínimo 12)
   * @returns Senha segura gerada
   */
  generateSecurePassword(length: number = 16): string {
    if (length < 12) {
      throw new Error('Comprimento mínimo da senha é 12 caracteres');
    }

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*(),.?":{}|<>';

    let password = '';

    // Garante pelo menos um de cada tipo obrigatório
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(numbers); // Pelo menos 2 números

    // Preenche o resto aleatoriamente
    const allChars = lowercase + uppercase + numbers + specialChars;
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(allChars);
    }

    // Embaralha a senha para não ter padrão previsível
    return password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
  }

  /**
   * Obtém um caractere aleatório de uma string
   * @param chars - String com caracteres possíveis
   * @returns Caractere aleatório
   * @private
   */
  private getRandomChar(chars: string): string {
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  /**
   * Adiciona senhas customizadas à blacklist (para uso futuro)
   * @param passwords - Array de senhas a serem adicionadas
   */
  addToBlacklist(passwords: string[]): void {
    COMMON_PASSWORDS.push(...passwords.map((p) => p.toLowerCase()));
    this.logger.debug(`${passwords.length} senhas adicionadas à blacklist`);
  }
}
