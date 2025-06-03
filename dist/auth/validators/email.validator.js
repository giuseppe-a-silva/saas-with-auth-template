"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsValidEmailConstraint = void 0;
exports.IsValidEmail = IsValidEmail;
const class_validator_1 = require("class-validator");
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
let IsValidEmailConstraint = class IsValidEmailConstraint {
    validate(value, _args) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(value)) {
            return false;
        }
        if (value.length > 320) {
            return false;
        }
        const domain = value.split('@')[1]?.toLowerCase();
        if (domain && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
            return false;
        }
        if (this.hasSuspiciousPatterns(value)) {
            return false;
        }
        return true;
    }
    defaultMessage(args) {
        const value = args.value;
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
    hasSuspiciousPatterns(email) {
        if (email.includes('..')) {
            return true;
        }
        const localPart = email.split('@')[0];
        if (localPart?.startsWith('.') || localPart?.endsWith('.')) {
            return true;
        }
        const suspiciousPatterns = [
            /\+\+/,
            /--/,
            /__/,
            /\.\./,
        ];
        return suspiciousPatterns.some((pattern) => pattern.test(email));
    }
};
exports.IsValidEmailConstraint = IsValidEmailConstraint;
exports.IsValidEmailConstraint = IsValidEmailConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isValidEmail', async: false })
], IsValidEmailConstraint);
function IsValidEmail(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isValidEmail',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidEmailConstraint,
        });
    };
}
//# sourceMappingURL=email.validator.js.map