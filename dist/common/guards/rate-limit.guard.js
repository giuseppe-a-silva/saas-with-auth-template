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
var RateLimitGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = exports.RateLimit = exports.RATE_LIMIT_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
exports.RATE_LIMIT_KEY = 'rate_limit';
const RateLimit = (config) => Reflect.metadata(exports.RATE_LIMIT_KEY, config);
exports.RateLimit = RateLimit;
let RateLimitGuard = RateLimitGuard_1 = class RateLimitGuard {
    reflector;
    logger = new common_1.Logger(RateLimitGuard_1.name);
    requestCounts = new Map();
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const rateLimitConfig = this.reflector.getAllAndOverride(exports.RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
        if (!rateLimitConfig) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const clientIp = this.extractClientIp(request);
        const now = Date.now();
        const key = `${clientIp}:${request.path}`;
        let requestData = this.requestCounts.get(key);
        if (!requestData || now > requestData.resetTime) {
            requestData = {
                count: 0,
                resetTime: now + rateLimitConfig.windowMs,
            };
        }
        requestData.count++;
        this.requestCounts.set(key, requestData);
        if (requestData.count > rateLimitConfig.maxRequests) {
            this.logger.warn(`Rate limit excedido para IP ${clientIp} no endpoint ${request.path}`, {
                ip: clientIp,
                endpoint: request.path,
                count: requestData.count,
                limit: rateLimitConfig.maxRequests,
                windowMs: rateLimitConfig.windowMs,
            });
            throw new common_1.HttpException(`Muitas requisições. Limite: ${rateLimitConfig.maxRequests} por ${rateLimitConfig.windowMs / 1000}s`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (Math.random() < 0.01) {
            this.cleanupExpiredEntries(now);
        }
        return true;
    }
    extractClientIp(request) {
        return ((request.get('x-forwarded-for') ?? '').split(',').shift()?.trim() ??
            request.get('x-real-ip') ??
            request.socket.remoteAddress ??
            'unknown');
    }
    cleanupExpiredEntries(now) {
        let cleanedCount = 0;
        for (const [key, data] of this.requestCounts.entries()) {
            if (now > data.resetTime) {
                this.requestCounts.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.logger.debug(`Limpeza de rate limit: ${cleanedCount} entradas removidas`);
        }
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = RateLimitGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map