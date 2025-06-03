import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

/**
 * Guard de autenticação JWT com suporte a rotas públicas
 * Estende o AuthGuard do Passport para validar tokens JWT
 * Permite bypass de autenticação para rotas marcadas com @Public()
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determina se a requisição pode prosseguir
   * Verifica se a rota é pública ou se o token JWT é válido
   * @param context - Contexto de execução da requisição
   * @returns true se autorizado, false caso contrário
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Verifica se o decorator @Public() está presente no handler ou na classe
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se for público, permite o acesso sem autenticação JWT
    if (isPublic) {
      return true;
    }

    // Caso contrário, prossegue com a validação padrão do AuthGuard('jwt')
    return super.canActivate(context);
  }
}
