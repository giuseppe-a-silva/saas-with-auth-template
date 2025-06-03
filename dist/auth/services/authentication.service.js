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
var AuthenticationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
const users_service_1 = require("../../users/users.service");
const password_service_1 = require("./password.service");
const token_service_1 = require("./token.service");
let AuthenticationService = AuthenticationService_1 = class AuthenticationService {
    usersService;
    passwordService;
    tokenService;
    prisma;
    logger = new common_1.Logger(AuthenticationService_1.name);
    constructor(usersService, passwordService, tokenService, prisma) {
        this.usersService = usersService;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.prisma = prisma;
    }
    async validateUser(identifier, password) {
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    OR: [{ email: identifier }, { username: identifier }],
                },
            });
            if (!user) {
                this.logger.warn(`Usuário não encontrado: ${identifier}`);
                return null;
            }
            const isPasswordValid = await this.passwordService.comparePassword(password, user.password);
            if (!isPasswordValid) {
                this.logger.warn(`Senha inválida para usuário: ${identifier}`);
                return null;
            }
            const { password: _, ...userWithoutPassword } = user;
            this.logger.log(`Usuário ${identifier} validado com sucesso`);
            return userWithoutPassword;
        }
        catch (error) {
            this.logger.error(`Erro ao validar usuário ${identifier}:`, error);
            throw error;
        }
    }
    async login(loginDto, response) {
        try {
            const user = await this.validateUser(loginDto.identifier, loginDto.password);
            if (!user) {
                throw new common_1.UnauthorizedException('Credenciais inválidas.');
            }
            const tokens = await this.tokenService.generateTokens(user);
            this.tokenService.setRefreshTokenCookie(response, tokens.refreshToken);
            this.logger.log(`Login realizado com sucesso para usuário: ${user.email}`);
            return { accessToken: tokens.accessToken };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Erro durante login:', error);
            throw new common_1.InternalServerErrorException('Erro interno durante login');
        }
    }
    async register(registerDto) {
        try {
            const newUser = await this.usersService.createUser({
                email: registerDto.email,
                username: registerDto.username,
                password: registerDto.password,
            });
            const { password: _, ...userWithoutPassword } = newUser;
            this.logger.log(`Novo usuário registrado: ${newUser.email}`);
            return userWithoutPassword;
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                this.logger.warn(`Tentativa de registro com dados duplicados: ${registerDto.email}`);
                throw new common_1.ConflictException('Email ou nome de usuário já cadastrado.');
            }
            this.logger.error('Erro no registro:', error);
            throw new common_1.InternalServerErrorException('Erro ao registrar usuário.');
        }
    }
    async refreshToken(user) {
        try {
            const accessToken = await this.tokenService.generateAccessToken(user);
            this.logger.log(`Token renovado para usuário: ${user.email}`);
            return { accessToken };
        }
        catch (error) {
            this.logger.error(`Erro ao renovar token para usuário ${user.email}:`, error);
            throw new common_1.InternalServerErrorException('Erro ao renovar token');
        }
    }
    logout(response) {
        try {
            this.tokenService.clearRefreshTokenCookie(response);
            this.logger.log('Logout realizado com sucesso');
        }
        catch (error) {
            this.logger.error('Erro durante logout:', error);
            throw new common_1.InternalServerErrorException('Erro durante logout');
        }
    }
    async validateToken(token, isRefreshToken = false) {
        try {
            const payload = await this.tokenService.validateToken(token, isRefreshToken);
            if (!payload) {
                return null;
            }
            const user = await this.usersService.findOneById(payload.sub);
            if (!user) {
                this.logger.warn(`Usuário não encontrado para token válido: ${payload.sub}`);
                return null;
            }
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        catch (error) {
            this.logger.error('Erro ao validar token:', error);
            return null;
        }
    }
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await this.usersService.findOneById(userId);
            if (!user) {
                throw new common_1.UnauthorizedException('Usuário não encontrado');
            }
            const isCurrentPasswordValid = await this.passwordService.comparePassword(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new common_1.UnauthorizedException('Senha atual incorreta');
            }
            const hashedNewPassword = await this.passwordService.hashPassword(newPassword);
            await this.prisma.user.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            });
            this.logger.log(`Senha alterada com sucesso para usuário: ${user.email}`);
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Erro ao alterar senha para usuário ${userId}:`, error);
            throw new common_1.InternalServerErrorException('Erro ao alterar senha');
        }
    }
    async userExists(identifier) {
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    OR: [{ email: identifier }, { username: identifier }],
                },
                select: { id: true },
            });
            return user !== null;
        }
        catch (error) {
            this.logger.error(`Erro ao verificar existência do usuário ${identifier}:`, error);
            return false;
        }
    }
};
exports.AuthenticationService = AuthenticationService;
exports.AuthenticationService = AuthenticationService = AuthenticationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        password_service_1.PasswordService,
        token_service_1.TokenService,
        prisma_service_1.PrismaService])
], AuthenticationService);
//# sourceMappingURL=authentication.service.js.map