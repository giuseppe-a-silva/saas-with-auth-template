import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { Response } from 'express';
import { JwtPayload } from '../strategies/jwt.strategy';
export declare class TokenService {
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    constructor(jwtService: JwtService, configService: ConfigService);
    generateTokens(user: Omit<User, 'password'>): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    generateAccessToken(payload: JwtPayload | Omit<User, 'password'>): Promise<string>;
    private generateRefreshToken;
    setRefreshTokenCookie(response: Response, refreshToken: string): void;
    clearRefreshTokenCookie(response: Response): void;
    validateToken(token: string, isRefreshToken?: boolean): Promise<JwtPayload | null>;
    private parseExpiryToMilliseconds;
    decodeToken(token: string): JwtPayload | null;
}
