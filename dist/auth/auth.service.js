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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const authentication_service_1 = require("./services/authentication.service");
let AuthService = AuthService_1 = class AuthService {
    authenticationService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(authenticationService) {
        this.authenticationService = authenticationService;
    }
    async validateUser(identifier, password) {
        this.logger.debug(`Validando usuário: ${identifier}`);
        return this.authenticationService.validateUser(identifier, password);
    }
    async login(loginDto, response) {
        this.logger.debug(`Realizando login para: ${loginDto.identifier}`);
        return this.authenticationService.login(loginDto, response);
    }
    async register(registerDto) {
        this.logger.debug(`Registrando novo usuário: ${registerDto.email}`);
        return this.authenticationService.register(registerDto);
    }
    async refreshToken(user) {
        this.logger.debug(`Renovando token para usuário: ${user.email}`);
        return this.authenticationService.refreshToken(user);
    }
    logout(response) {
        this.logger.debug('Realizando logout');
        this.authenticationService.logout(response);
    }
    async changePassword(userId, currentPassword, newPassword) {
        this.logger.debug(`Alterando senha para usuário: ${userId}`);
        return this.authenticationService.changePassword(userId, currentPassword, newPassword);
    }
    async validateToken(token, isRefreshToken = false) {
        this.logger.debug(`Validando token${isRefreshToken ? ' (refresh)' : ''}`);
        return this.authenticationService.validateToken(token, isRefreshToken);
    }
    async userExists(identifier) {
        this.logger.debug(`Verificando existência do usuário: ${identifier}`);
        return this.authenticationService.userExists(identifier);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [authentication_service_1.AuthenticationService])
], AuthService);
//# sourceMappingURL=auth.service.js.map