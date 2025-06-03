import { User } from '@prisma/client';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticationService } from './services/authentication.service';
export declare class AuthService {
    private readonly authenticationService;
    private readonly logger;
    constructor(authenticationService: AuthenticationService);
    validateUser(identifier: string, password: string): Promise<Omit<User, 'password'> | null>;
    login(loginDto: LoginDto, response: Response): Promise<{
        accessToken: string;
    }>;
    register(registerDto: RegisterDto): Promise<Omit<User, 'password'>>;
    refreshToken(user: Omit<User, 'password'>): Promise<{
        accessToken: string;
    }>;
    logout(response: Response): void;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
    validateToken(token: string, isRefreshToken?: boolean): Promise<Omit<User, 'password'> | null>;
    userExists(identifier: string): Promise<boolean>;
}
