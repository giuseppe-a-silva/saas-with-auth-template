import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}
export declare const RATE_LIMIT_KEY = "rate_limit";
export declare const RateLimit: (config: RateLimitConfig) => MethodDecorator;
export declare class RateLimitGuard implements CanActivate {
    private readonly reflector;
    private readonly logger;
    private readonly requestCounts;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
    private extractClientIp;
    private cleanupExpiredEntries;
}
export {};
