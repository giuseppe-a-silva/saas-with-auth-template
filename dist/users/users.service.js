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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../database/prisma.service");
let UsersService = UsersService_1 = class UsersService {
    prisma;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOneById(id) {
        try {
            const user = await this.prisma.user.findUnique({ where: { id } });
            if (user) {
                this.logger.log(`Usuário encontrado por ID: ${id}`);
            }
            return user;
        }
        catch (error) {
            this.logger.error(`Erro ao buscar usuário por ID ${id}:`, error);
            throw error;
        }
    }
    async findOneByEmail(email) {
        try {
            const user = await this.prisma.user.findUnique({ where: { email } });
            if (user) {
                this.logger.log(`Usuário encontrado por email: ${email}`);
            }
            return user;
        }
        catch (error) {
            this.logger.error(`Erro ao buscar usuário por email ${email}:`, error);
            throw error;
        }
    }
    async findOneByUsername(username) {
        try {
            const user = await this.prisma.user.findUnique({ where: { username } });
            if (user) {
                this.logger.log(`Usuário encontrado por username: ${username}`);
            }
            return user;
        }
        catch (error) {
            this.logger.error(`Erro ao buscar usuário por username ${username}:`, error);
            throw error;
        }
    }
    async createUser(data) {
        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(data.password, saltRounds);
            const newUser = await this.prisma.user.create({
                data: {
                    ...data,
                    password: hashedPassword,
                },
            });
            this.logger.log(`Novo usuário criado: ${newUser.email} (ID: ${newUser.id})`);
            return newUser;
        }
        catch (error) {
            this.logger.error(`Erro ao criar usuário:`, error);
            throw error;
        }
    }
    async updateUser(params) {
        const { where, data } = params;
        try {
            if (typeof data.password === 'string') {
                const saltRounds = 10;
                data.password = await bcrypt.hash(data.password, saltRounds);
            }
            const updatedUser = await this.prisma.user.update({
                data,
                where,
            });
            this.logger.log(`Usuário atualizado: ${updatedUser.email} (ID: ${updatedUser.id})`);
            return updatedUser;
        }
        catch (error) {
            this.logger.error(`Erro ao atualizar usuário:`, error);
            throw error;
        }
    }
    async deleteUser(where) {
        try {
            const deletedUser = await this.prisma.user.delete({ where });
            this.logger.log(`Usuário removido: ${deletedUser.email} (ID: ${deletedUser.id})`);
            return deletedUser;
        }
        catch (error) {
            this.logger.error(`Erro ao remover usuário:`, error);
            throw error;
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map