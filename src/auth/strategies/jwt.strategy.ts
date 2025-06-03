import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { User } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

// Define o payload esperado do token JWT
export interface JwtPayload {
  sub: string; // ID do usuário
  email: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não está configurado');
    }

    super({
      // Extrai o token do header Authorization como Bearer Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Ignora a expiração aqui, pois o Passport já faz isso. Se expirado, rejeita automaticamente.
      ignoreExpiration: false,
      // Usa a chave secreta definida nas variáveis de ambiente
      secretOrKey: jwtSecret,
    });
  }

  // Valida o payload do token e retorna o usuário correspondente
  async validate(payload: JwtPayload): Promise<User> {
    // Verifica se o usuário (sub) existe no banco de dados
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      // Se o usuário não for encontrado, lança uma exceção de não autorizado
      throw new UnauthorizedException(
        'Usuário não encontrado ou token inválido.',
      );
    }
    // Retorna o objeto do usuário (sem a senha) para ser injetado na requisição (@CurrentUser)
    const { password: _password, ...result } = user;
    return result as User; // Retorna o usuário validado
  }
}
