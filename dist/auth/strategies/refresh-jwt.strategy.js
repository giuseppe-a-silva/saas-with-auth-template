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
exports.RefreshJwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const users_service_1 = require("../../users/users.service");
let RefreshJwtStrategy = class RefreshJwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt-refresh') {
    configService;
    usersService;
    constructor(configService, usersService) {
        const jwtRefreshSecret = configService.get('JWT_REFRESH_SECRET');
        if (!jwtRefreshSecret) {
            throw new Error('JWT_REFRESH_SECRET não está configurado');
        }
        super({
            jwtFromRequest: (req) => {
                let token = null;
                if (req?.cookies) {
                    token = req.cookies['refresh_token'];
                }
                return token;
            },
            ignoreExpiration: true,
            secretOrKey: jwtRefreshSecret,
            passReqToCallback: true,
        });
        this.configService = configService;
        this.usersService = usersService;
    }
    async validate(req, payload) {
        const refreshToken = req.cookies?.['refresh_token'];
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Refresh token não encontrado.');
        }
        const user = await this.usersService.findOneById(payload.sub);
        if (!user) {
            throw new common_1.UnauthorizedException('Usuário não encontrado.');
        }
        const { password, ...result } = user;
        return { ...result, refreshToken };
    }
};
exports.RefreshJwtStrategy = RefreshJwtStrategy;
exports.RefreshJwtStrategy = RefreshJwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        users_service_1.UsersService])
], RefreshJwtStrategy);
//# sourceMappingURL=refresh-jwt.strategy.js.map