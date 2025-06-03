"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsStrongPasswordConstraint = void 0;
exports.IsStrongPassword = IsStrongPassword;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const password_service_1 = require("../services/password.service");
let IsStrongPasswordConstraint = class IsStrongPasswordConstraint {
    passwordService;
    constructor(passwordService) {
        this.passwordService = passwordService;
    }
    validate(value, _args) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        const validationResult = this.passwordService.validatePasswordStrength(value);
        return validationResult.isValid;
    }
    defaultMessage(args) {
        const value = args.value;
        if (!value || typeof value !== 'string') {
            return 'A senha deve ser uma string válida';
        }
        const validationResult = this.passwordService.validatePasswordStrength(value);
        if (validationResult.errors.length > 0) {
            return `Senha não atende aos critérios de segurança: ${validationResult.errors.join(', ')}`;
        }
        return 'A senha deve atender aos critérios mínimos de segurança';
    }
};
exports.IsStrongPasswordConstraint = IsStrongPasswordConstraint;
exports.IsStrongPasswordConstraint = IsStrongPasswordConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isStrongPassword', async: false }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [password_service_1.PasswordService])
], IsStrongPasswordConstraint);
function IsStrongPassword(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isStrongPassword',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsStrongPasswordConstraint,
        });
    };
}
//# sourceMappingURL=strong-password.validator.js.map