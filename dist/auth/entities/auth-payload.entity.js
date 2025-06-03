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
exports.SimpleStatusPayload = exports.AuthPayload = void 0;
const graphql_1 = require("@nestjs/graphql");
let AuthPayload = class AuthPayload {
    accessToken;
};
exports.AuthPayload = AuthPayload;
__decorate([
    (0, graphql_1.Field)(() => String, { description: 'Token de acesso JWT' }),
    __metadata("design:type", String)
], AuthPayload.prototype, "accessToken", void 0);
exports.AuthPayload = AuthPayload = __decorate([
    (0, graphql_1.ObjectType)({
        description: 'Resposta da autenticação, contendo o token de acesso',
    })
], AuthPayload);
let SimpleStatusPayload = class SimpleStatusPayload {
    success;
    message;
};
exports.SimpleStatusPayload = SimpleStatusPayload;
__decorate([
    (0, graphql_1.Field)(() => Boolean, {
        description: 'Indica se a operação foi bem-sucedida',
    }),
    __metadata("design:type", Boolean)
], SimpleStatusPayload.prototype, "success", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, {
        nullable: true,
        description: 'Mensagem opcional de status',
    }),
    __metadata("design:type", String)
], SimpleStatusPayload.prototype, "message", void 0);
exports.SimpleStatusPayload = SimpleStatusPayload = __decorate([
    (0, graphql_1.ObjectType)({ description: 'Resposta simples para operações como logout' })
], SimpleStatusPayload);
//# sourceMappingURL=auth-payload.entity.js.map