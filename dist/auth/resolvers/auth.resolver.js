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
exports.AuthResolver = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const rate_limit_guard_1 = require("../../common/guards/rate-limit.guard");
const user_entity_1 = require("../../users/entities/user.entity");
const auth_service_1 = require("../auth.service");
const login_dto_1 = require("../dto/login.dto");
const register_dto_1 = require("../dto/register.dto");
const auth_payload_entity_1 = require("../entities/auth-payload.entity");
const refresh_jwt_guard_1 = require("../guards/refresh-jwt.guard");
let AuthResolver = class AuthResolver {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto, context) {
        return this.authService.login(loginDto, context.res);
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async refreshToken(context) {
        const user = context.req.user;
        return this.authService.refreshToken(user);
    }
    logout(context) {
        this.authService.logout(context.res);
        return { success: true, message: 'Logout realizado com sucesso.' };
    }
};
exports.AuthResolver = AuthResolver;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, rate_limit_guard_1.RateLimit)({ windowMs: 60000, maxRequests: 5 }),
    (0, graphql_1.Mutation)(() => auth_payload_entity_1.AuthPayload, {
        description: 'Autentica usuário e retorna tokens de acesso',
    }),
    __param(0, (0, graphql_1.Args)('loginInput')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, rate_limit_guard_1.RateLimit)({ windowMs: 300000, maxRequests: 3 }),
    (0, graphql_1.Mutation)(() => user_entity_1.User, {
        description: 'Registra novo usuário no sistema',
    }),
    __param(0, (0, graphql_1.Args)('registerInput')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "register", null);
__decorate([
    (0, common_1.UseGuards)(refresh_jwt_guard_1.RefreshJwtGuard),
    (0, graphql_1.Mutation)(() => auth_payload_entity_1.AuthPayload, {
        description: 'Gera um novo token de acesso usando o refresh token (via cookie).',
    }),
    __param(0, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "refreshToken", null);
__decorate([
    (0, graphql_1.Mutation)(() => auth_payload_entity_1.SimpleStatusPayload, {
        description: 'Realiza o logout do usuário limpando o cookie de refresh token.',
    }),
    __param(0, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", auth_payload_entity_1.SimpleStatusPayload)
], AuthResolver.prototype, "logout", null);
exports.AuthResolver = AuthResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthResolver);
//# sourceMappingURL=auth.resolver.js.map