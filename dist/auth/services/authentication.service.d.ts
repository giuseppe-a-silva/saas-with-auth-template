import { User } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
export declare class AuthenticationService {
    private readonly usersService;
    private readonly passwordService;
    private readonly tokenService;
    private readonly prisma;
    private readonly logger;
    constructor(usersService: UsersService, passwordService: PasswordService, tokenService: TokenService, prisma: PrismaService);
    validateUser(identifier: string, password: string): Promise<Omit<User, 'password'> | null>;
    login(loginDto: LoginDto, response: Response): Promise<{
        accessToken: string;
    }>;
    register(registerDto: RegisterDto): Promise<Omit<User, 'password'>>;
    refreshToken(user: Omit<User, 'password'>): Promise<{
        accessToken: string;
    }>;
    logout(response: Response): void;
    validateToken(token: string, isRefreshToken?: boolean): Promise<Omit<User, 'password'> | null>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
    userExists(identifier: string): Promise<boolean>;
}
