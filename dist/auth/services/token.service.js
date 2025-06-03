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
var TokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
let TokenService = TokenService_1 = class TokenService {
    jwtService;
    configService;
    logger = new common_1.Logger(TokenService_1.name);
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
        };
        try {
            const [accessToken, refreshToken] = await Promise.all([
                this.generateAccessToken(payload),
                this.generateRefreshToken(payload),
            ]);
            this.logger.debug(`Tokens gerados para usuário: ${user.email}`);
            return { accessToken, refreshToken };
        }
        catch (error) {
            this.logger.error(`Erro ao gerar tokens para usuário ${user.email}:`, error);
            throw error;
        }
    }
    async generateAccessToken(payload) {
        try {
            const jwtPayload = 'sub' in payload
                ? payload
                : {
                    sub: payload.id,
                    email: payload.email,
                    username: payload.username,
                    role: payload.role,
                };
            const accessToken = await this.jwtService.signAsync(jwtPayload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRY', '15m'),
            });
            this.logger.debug(`Access token gerado para usuário: ${jwtPayload.email}`);
            return accessToken;
        }
        catch (error) {
            this.logger.error('Erro ao gerar access token:', error);
            throw error;
        }
    }
    async generateRefreshToken(payload) {
        try {
            const refreshToken = await this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRY', '7d'),
            });
            this.logger.debug(`Refresh token gerado para usuário: ${payload.email}`);
            return refreshToken;
        }
        catch (error) {
            this.logger.error('Erro ao gerar refresh token:', error);
            throw error;
        }
    }
    setRefreshTokenCookie(response, refreshToken) {
        try {
            const refreshTokenExpiry = this.configService.get('REFRESH_TOKEN_EXPIRY', '7d');
            const maxAge = this.parseExpiryToMilliseconds(refreshTokenExpiry);
            response.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: this.configService.get('NODE_ENV') === 'production',
                sameSite: 'strict',
                maxAge,
                path: '/',
            });
            this.logger.debug('Refresh token cookie definido com sucesso');
        }
        catch (error) {
            this.logger.error('Erro ao definir refresh token cookie:', error);
            throw error;
        }
    }
    clearRefreshTokenCookie(response) {
        try {
            response.clearCookie('refresh_token', {
                httpOnly: true,
                secure: this.configService.get('NODE_ENV') === 'production',
                sameSite: 'strict',
                path: '/',
            });
            this.logger.debug('Refresh token cookie removido com sucesso');
        }
        catch (error) {
            this.logger.error('Erro ao remover refresh token cookie:', error);
            throw error;
        }
    }
    async validateToken(token, isRefreshToken = false) {
        try {
            const secret = isRefreshToken
                ? this.configService.get('JWT_REFRESH_SECRET')
                : this.configService.get('JWT_SECRET');
            const payload = await this.jwtService.verifyAsync(token, {
                secret,
            });
            this.logger.debug(`Token ${isRefreshToken ? 'refresh' : 'access'} validado com sucesso`);
            return payload;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            this.logger.warn(`Token ${isRefreshToken ? 'refresh' : 'access'} inválido:`, errorMessage);
            return null;
        }
    }
    parseExpiryToMilliseconds(expiry) {
        const unit = expiry.slice(-1);
        const value = parseInt(expiry.slice(0, -1), 10);
        if (isNaN(value)) {
            throw new Error(`Valor de expiração inválido: ${expiry}`);
        }
        switch (unit) {
            case 's':
                return value * 1000;
            case 'm':
                return value * 60 * 1000;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'd':
                return value * 24 * 60 * 60 * 1000;
            default:
                throw new Error(`Unidade de expiração inválida: ${unit}`);
        }
    }
    decodeToken(token) {
        try {
            const decoded = this.jwtService.decode(token);
            if (decoded &&
                typeof decoded === 'object' &&
                'sub' in decoded &&
                'email' in decoded &&
                'username' in decoded &&
                'role' in decoded) {
                return decoded;
            }
            return null;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            this.logger.warn('Erro ao decodificar token:', errorMessage);
            return null;
        }
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = TokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], TokenService);
//# sourceMappingURL=token.service.js.map