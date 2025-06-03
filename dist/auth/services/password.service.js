"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PasswordService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
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
let PasswordService = PasswordService_1 = class PasswordService {
    logger = new common_1.Logger(PasswordService_1.name);
    saltRounds = 12;
    async hashPassword(plainPassword) {
        try {
            const hashedPassword = await bcrypt.hash(plainPassword, this.saltRounds);
            this.logger.debug('Senha hasheada com sucesso');
            return hashedPassword;
        }
        catch (error) {
            this.logger.error('Erro ao fazer hash da senha:', error);
            throw new Error('Erro interno ao processar senha');
        }
    }
    async comparePassword(plainPassword, hashedPassword) {
        try {
            const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
            this.logger.debug(`Comparação de senha: ${isMatch ? 'sucesso' : 'falha'}`);
            return isMatch;
        }
        catch (error) {
            this.logger.error('Erro ao comparar senhas:', error);
            return false;
        }
    }
    validatePasswordStrength(password) {
        const errors = [];
        let score = 0;
        if (password.length < 12) {
            errors.push('A senha deve ter no mínimo 12 caracteres');
        }
        else {
            score += 20;
            if (password.length >= 16)
                score += 10;
            if (password.length >= 20)
                score += 10;
        }
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const letterCount = (password.match(/[a-zA-Z]/g) ?? []).length;
        if (letterCount < 4) {
            errors.push('A senha deve ter no mínimo 4 letras');
        }
        else {
            score += 15;
        }
        if (!hasUppercase) {
            errors.push('A senha deve ter pelo menos uma letra maiúscula');
        }
        else {
            score += 15;
        }
        if (!hasLowercase) {
            errors.push('A senha deve ter pelo menos uma letra minúscula');
        }
        else {
            score += 15;
        }
        if (!hasNumbers) {
            errors.push('A senha deve ter pelo menos um número');
        }
        else {
            score += 15;
        }
        if (hasSpecialChars) {
            score += 10;
        }
        const hasSequentialChars = this.hasSequentialCharacters(password);
        if (hasSequentialChars) {
            errors.push('A senha não deve ter sequências óbvias (123, abc, etc.)');
            score -= 15;
        }
        const hasRepeatedChars = this.hasExcessiveRepeatedCharacters(password);
        if (hasRepeatedChars) {
            errors.push('A senha não deve ter muitos caracteres repetidos');
            score -= 10;
        }
        if (this.isPasswordInBlacklist(password)) {
            errors.push('Esta senha é muito comum e não é segura');
            score = Math.min(score, 20);
        }
        score = Math.max(0, Math.min(100, score));
        let strength;
        if (score >= 80)
            strength = 'very-strong';
        else if (score >= 60)
            strength = 'strong';
        else if (score >= 40)
            strength = 'medium';
        else
            strength = 'weak';
        const isValid = errors.length === 0 && score >= 40;
        return {
            isValid,
            errors,
            strength,
            score,
        };
    }
    hasSequentialCharacters(password) {
        const lowerPassword = password.toLowerCase();
        const numSequences = [
            '0123',
            '1234',
            '2345',
            '3456',
            '4567',
            '5678',
            '6789',
        ];
        const alphaSequences = [
            'abcd',
            'bcde',
            'cdef',
            'defg',
            'efgh',
            'fghi',
            'ghij',
        ];
        const keyboardSequences = ['qwer', 'asdf', 'zxcv', 'qwerty', 'asdfgh'];
        const allSequences = [
            ...numSequences,
            ...alphaSequences,
            ...keyboardSequences,
        ];
        return allSequences.some((seq) => lowerPassword.includes(seq) ||
            lowerPassword.includes(seq.split('').reverse().join('')));
    }
    hasExcessiveRepeatedCharacters(password) {
        const charCount = {};
        for (const char of password) {
            charCount[char] = (charCount[char] ?? 0) + 1;
            if (charCount[char] > 3) {
                return true;
            }
        }
        const repeatedPatterns = /(.)\1{2,}/.test(password);
        return repeatedPatterns;
    }
    isPasswordInBlacklist(password) {
        const lowerPassword = password.toLowerCase();
        if (COMMON_PASSWORDS.includes(lowerPassword)) {
            return true;
        }
        const containsCommonWord = COMMON_PASSWORDS.some((commonPassword) => {
            if (commonPassword.length < 4)
                return false;
            return lowerPassword.includes(commonPassword);
        });
        return containsCommonWord;
    }
    generateSecurePassword(length = 16) {
        if (length < 12) {
            throw new Error('Comprimento mínimo da senha é 12 caracteres');
        }
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const specialChars = '!@#$%^&*(),.?":{}|<>';
        let password = '';
        password += this.getRandomChar(lowercase);
        password += this.getRandomChar(uppercase);
        password += this.getRandomChar(numbers);
        password += this.getRandomChar(numbers);
        const allChars = lowercase + uppercase + numbers + specialChars;
        for (let i = password.length; i < length; i++) {
            password += this.getRandomChar(allChars);
        }
        return password
            .split('')
            .sort(() => 0.5 - Math.random())
            .join('');
    }
    getRandomChar(chars) {
        return chars.charAt(Math.floor(Math.random() * chars.length));
    }
    addToBlacklist(passwords) {
        COMMON_PASSWORDS.push(...passwords.map((p) => p.toLowerCase()));
        this.logger.debug(`${passwords.length} senhas adicionadas à blacklist`);
    }
};
exports.PasswordService = PasswordService;
exports.PasswordService = PasswordService = PasswordService_1 = __decorate([
    (0, common_1.Injectable)()
], PasswordService);
//# sourceMappingURL=password.service.js.map