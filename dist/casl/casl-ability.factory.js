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
var CaslAbilityFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaslAbilityFactory = void 0;
const ability_1 = require("@casl/ability");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permission_entity_1 = require("../permissions/entities/permission.entity");
const permissions_service_1 = require("../permissions/permissions.service");
let CaslAbilityFactory = CaslAbilityFactory_1 = class CaslAbilityFactory {
    permissionsService;
    logger = new common_1.Logger(CaslAbilityFactory_1.name);
    constructor(permissionsService) {
        this.permissionsService = permissionsService;
    }
    async createForUser(user) {
        this.logger.debug('Criando abilities para usuário', {
            userId: user.id,
            userRole: user.role,
        });
        const { can, cannot, build } = new ability_1.AbilityBuilder(ability_1.Ability);
        if (user.role === client_1.Role.ADMIN) {
            can(permission_entity_1.Action.Manage, 'all');
            this.logger.debug('Permissões de ADMIN aplicadas', { userId: user.id });
        }
        else if (user.role === client_1.Role.EDITOR) {
            can(permission_entity_1.Action.Read, 'all');
            this.logger.debug('Permissões de EDITOR aplicadas', { userId: user.id });
        }
        else {
            can(permission_entity_1.Action.Read, 'all');
            this.logger.debug('Permissões de USER aplicadas', { userId: user.id });
        }
        try {
            const dbPermissions = await this.permissionsService.findUserPermissions(user.id);
            this.logger.debug('Aplicando permissões específicas do banco', {
                userId: user.id,
                permissionsCount: dbPermissions.length,
            });
            dbPermissions.forEach((permission) => {
                const action = permission.action;
                const subject = permission.subject;
                let condition = undefined;
                try {
                    if (permission.condition) {
                        condition = JSON.parse(permission.condition);
                    }
                }
                catch (error) {
                    this.logger.warn('Erro ao parsear condição JSON da permissão', {
                        permissionId: permission.id,
                        condition: permission.condition,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
                if (permission.inverted) {
                    cannot(action, subject, condition).because(permission.reason ?? 'Permissão negada');
                    this.logger.debug('Permissão negativa aplicada', {
                        userId: user.id,
                        action,
                        subject,
                        reason: permission.reason,
                    });
                }
                else {
                    can(action, subject, condition).because(permission.reason ?? 'Permissão concedida');
                    this.logger.debug('Permissão positiva aplicada', {
                        userId: user.id,
                        action,
                        subject,
                        reason: permission.reason,
                    });
                }
            });
            this.logger.log('Abilities criadas com sucesso', {
                userId: user.id,
                rolePermissions: user.role,
                dbPermissionsCount: dbPermissions.length,
            });
            return build();
        }
        catch (error) {
            this.logger.error('Erro ao criar abilities para usuário', {
                userId: user.id,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
};
exports.CaslAbilityFactory = CaslAbilityFactory;
exports.CaslAbilityFactory = CaslAbilityFactory = CaslAbilityFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [permissions_service_1.PermissionsService])
], CaslAbilityFactory);
//# sourceMappingURL=casl-ability.factory.js.map