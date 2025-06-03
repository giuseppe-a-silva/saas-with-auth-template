import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { User } from '@prisma/client';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from './jwt.strategy'; // Reutiliza o mesmo payload

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtRefreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET não está configurado');
    }

    super({
      // Extrai o refresh token do cookie HttpOnly
      jwtFromRequest: (req: Request): string | null => {
        let token: string | null = null;
        if (req?.cookies) {
          token = req.cookies['refresh_token'] as string | null;
        }
        return token;
      },
      // Ignora a expiração aqui, pois a validação manual verificará
      ignoreExpiration: true, // Importante: A lógica de expiração será tratada no AuthService/Guard
      secretOrKey: jwtRefreshSecret,
      passReqToCallback: true, // Passa o objeto Request para o método validate
    });
  }

  // Valida o payload do refresh token e o token em si
  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<Omit<User, 'password'> & { refreshToken: string }> {
    const refreshToken = req.cookies?.['refresh_token'] as string;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não encontrado.');
    }

    // Busca o usuário associado ao token
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    // Aqui, você poderia adicionar uma lógica para verificar se o refresh token
    // ainda é válido (por exemplo, se não foi revogado em uma blacklist no DB)
    // Por simplicidade, vamos apenas retornar o usuário e o token

    // Retorna o usuário e o refresh token para uso no AuthService/Guard
    const { password: _password, ...result } = user;
    return { ...result, refreshToken };
  }
}
