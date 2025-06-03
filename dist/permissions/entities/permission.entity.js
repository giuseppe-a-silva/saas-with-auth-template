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
exports.Permission = exports.Action = void 0;
const graphql_1 = require("@nestjs/graphql");
const client_1 = require("@prisma/client");
var Action;
(function (Action) {
    Action["Manage"] = "manage";
    Action["Create"] = "create";
    Action["Read"] = "read";
    Action["Update"] = "update";
    Action["Delete"] = "delete";
})(Action || (exports.Action = Action = {}));
(0, graphql_1.registerEnumType)(Action, {
    name: 'Action',
    description: 'Ações possíveis para controle de permissão (CASL)',
});
(0, graphql_1.registerEnumType)(client_1.Role, {
    name: 'Role',
    description: 'Papéis de usuário definidos no sistema',
});
let Permission = class Permission {
    id;
    userId;
    action;
    subject;
    condition;
    inverted;
    reason;
};
exports.Permission = Permission;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { description: 'ID único da permissão' }),
    __metadata("design:type", String)
], Permission.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, {
        description: 'ID do usuário ao qual a permissão pertence',
    }),
    __metadata("design:type", String)
], Permission.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => Action, {
        description: 'Ação permitida ou negada (ex: read, update)',
    }),
    __metadata("design:type", String)
], Permission.prototype, "action", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, {
        description: 'Entidade ou recurso ao qual a ação se aplica (ex: User, Post, all)',
    }),
    __metadata("design:type", String)
], Permission.prototype, "subject", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, {
        nullable: true,
        description: 'Condições adicionais em formato JSON string (opcional)',
    }),
    __metadata("design:type", Object)
], Permission.prototype, "condition", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, {
        defaultValue: false,
        description: 'Indica se a permissão é invertida (cannot)',
    }),
    __metadata("design:type", Boolean)
], Permission.prototype, "inverted", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, {
        nullable: true,
        description: 'Justificativa ou descrição da permissão (opcional)',
    }),
    __metadata("design:type", Object)
], Permission.prototype, "reason", void 0);
exports.Permission = Permission = __decorate([
    (0, graphql_1.ObjectType)({
        description: 'Representa uma permissão específica no sistema (CASL)',
    })
], Permission);
//# sourceMappingURL=permission.entity.js.map