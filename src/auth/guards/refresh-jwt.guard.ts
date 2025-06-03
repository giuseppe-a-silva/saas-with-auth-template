import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para validação de refresh tokens
 * Utiliza a estratégia 'jwt-refresh' para validar tokens de renovação
 * Protege rotas que precisam de refresh token válido (como renovação de access token)
 */
@Injectable()
export class RefreshJwtGuard extends AuthGuard('jwt-refresh') {}
