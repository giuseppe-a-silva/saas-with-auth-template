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
var PermissionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let PermissionsService = PermissionsService_1 = class PermissionsService {
    prisma;
    logger = new common_1.Logger(PermissionsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findUserPermissions(userId) {
        this.logger.debug('Iniciando busca de permissões do usuário', { userId });
        try {
            const permissions = await this.prisma.permission.findMany({
                where: { userId },
            });
            this.logger.log('Permissões do usuário encontradas com sucesso', {
                userId,
                permissionsCount: permissions.length,
            });
            return permissions;
        }
        catch (error) {
            this.logger.error('Erro ao buscar permissões do usuário', {
                userId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
    async createPermission(data) {
        this.logger.debug('Iniciando criação de permissão', {
            action: data.action,
            subject: data.subject,
            inverted: data.inverted,
        });
        try {
            const permission = await this.prisma.permission.create({ data });
            this.logger.log('Permissão criada com sucesso', {
                permissionId: permission.id,
                userId: permission.userId,
                action: permission.action,
                subject: permission.subject,
            });
            return permission;
        }
        catch (error) {
            this.logger.error('Erro ao criar permissão', {
                action: data.action,
                subject: data.subject,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = PermissionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map