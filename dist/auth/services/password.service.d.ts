export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    score: number;
}
export declare class PasswordService {
    private readonly logger;
    private readonly saltRounds;
    hashPassword(plainPassword: string): Promise<string>;
    comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    validatePasswordStrength(password: string): PasswordValidationResult;
    private hasSequentialCharacters;
    private hasExcessiveRepeatedCharacters;
    private isPasswordInBlacklist;
    generateSecurePassword(length?: number): string;
    private getRandomChar;
    addToBlacklist(passwords: string[]): void;
}
