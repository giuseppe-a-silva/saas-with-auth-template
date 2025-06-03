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
exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
const email_validator_1 = require("../validators/email.validator");
const strong_password_validator_1 = require("../validators/strong-password.validator");
class RegisterDto {
    username;
    email;
    password;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'O nome de usuário não pode estar vazio.' }),
    (0, class_validator_1.IsString)({ message: 'O nome de usuário deve ser uma string.' }),
    (0, class_validator_1.Length)(3, 50, {
        message: 'O nome de usuário deve ter entre 3 e 50 caracteres.',
    }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_-]+$/, {
        message: 'O nome de usuário pode conter apenas letras, números, hífen (-) e underscore (_).',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'O email não pode estar vazio.' }),
    (0, email_validator_1.IsValidEmail)({
        message: 'Email deve ter um formato válido e não pode ser um email temporário.',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'A senha não pode estar vazia.' }),
    (0, class_validator_1.IsString)({ message: 'A senha deve ser uma string.' }),
    (0, strong_password_validator_1.IsStrongPassword)({
        message: 'A senha deve atender aos critérios de segurança definidos.',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
//# sourceMappingURL=register.dto.js.map