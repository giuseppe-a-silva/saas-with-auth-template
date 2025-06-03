import { Response } from 'express';
import { User } from '../../users/entities/user.entity';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthPayload, SimpleStatusPayload } from '../entities/auth-payload.entity';
export declare class AuthResolver {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, context: {
        res: Response;
    }): Promise<AuthPayload>;
    register(registerDto: RegisterDto): Promise<Omit<User, 'password'>>;
    refreshToken(context: {
        req: {
            user: Omit<User, 'password'>;
        };
    }): Promise<AuthPayload>;
    logout(context: {
        res: Response;
    }): SimpleStatusPayload;
}
