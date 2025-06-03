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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersResolver = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const check_permissions_decorator_1 = require("../../casl/decorators/check-permissions.decorator");
const casl_guard_1 = require("../../casl/guards/casl.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const permission_entity_1 = require("../../permissions/entities/permission.entity");
const user_entity_1 = require("../entities/user.entity");
const users_service_1 = require("../users.service");
let CreateUserInput = class CreateUserInput {
    email;
    username;
    password;
};
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateUserInput.prototype, "email", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserInput.prototype, "username", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CreateUserInput.prototype, "password", void 0);
CreateUserInput = __decorate([
    (0, graphql_1.InputType)({
        description: 'Dados para criar um novo usuário (geralmente feito via registro)',
    })
], CreateUserInput);
let UpdateUserInput = class UpdateUserInput extends (0, graphql_1.PartialType)(CreateUserInput) {
    password;
};
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserInput.prototype, "password", void 0);
UpdateUserInput = __decorate([
    (0, graphql_1.InputType)({ description: 'Dados para atualizar um usuário existente' })
], UpdateUserInput);
let UsersResolver = class UsersResolver {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    me(user) {
        return user;
    }
    async findUserById(id) {
        const user = await this.usersService.findOneById(id);
        return user;
    }
    async updateMyProfile(currentUser, updateUserInput) {
        const userIdToUpdate = currentUser.id;
        const dataToUpdate = {};
        if (updateUserInput.email)
            dataToUpdate.email = updateUserInput.email;
        if (updateUserInput.username)
            dataToUpdate.username = updateUserInput.username;
        if (updateUserInput.password)
            dataToUpdate.password = updateUserInput.password;
        if (Object.keys(dataToUpdate).length === 0) {
            return currentUser;
        }
        const updatedUser = await this.usersService.updateUser({
            where: { id: userIdToUpdate },
            data: dataToUpdate,
        });
        return updatedUser;
    }
    async deleteUser(id, currentUser) {
        if (id === currentUser.id) {
            throw new common_1.ForbiddenException('Você não pode deletar sua própria conta.');
        }
        const deletedUser = await this.usersService.deleteUser({ id });
        return deletedUser;
    }
};
exports.UsersResolver = UsersResolver;
__decorate([
    (0, graphql_1.Query)(() => user_entity_1.User, {
        description: 'Retorna os dados do usuário autenticado atualmente.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", user_entity_1.User)
], UsersResolver.prototype, "me", null);
__decorate([
    (0, graphql_1.Query)(() => user_entity_1.User, {
        nullable: true,
        description: 'Busca um usuário pelo seu ID.',
    }),
    (0, common_1.UseGuards)(casl_guard_1.CaslGuard),
    (0, check_permissions_decorator_1.CheckPermissions)({ action: permission_entity_1.Action.Read, subject: 'User' }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "findUserById", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_entity_1.User, {
        description: 'Atualiza o perfil do usuário autenticado.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('updateUserInput')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateUserInput]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "updateMyProfile", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_entity_1.User, {
        description: 'Deleta um usuário do sistema (requer permissão).',
    }),
    (0, common_1.UseGuards)(casl_guard_1.CaslGuard),
    (0, check_permissions_decorator_1.CheckPermissions)({ action: permission_entity_1.Action.Delete, subject: 'User' }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "deleteUser", null);
exports.UsersResolver = UsersResolver = __decorate([
    (0, graphql_1.Resolver)(() => user_entity_1.User),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersResolver);
//# sourceMappingURL=users.resolver.js.map