import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User as PrismaUser } from '@prisma/client';
import { Request } from 'express'; // Import Request type from express
import { ERROR_MESSAGES } from '../../common/constants/error-messages.constants';
import { AppAbility, CaslAbilityFactory } from '../casl-ability.factory';
import {
  CHECK_PERMISSIONS_KEY,
  RequiredRule,
} from '../decorators/check-permissions.decorator';

/**
 * Interface para estender o tipo Request com propriedade user
 * Permite tipagem segura do usuário autenticado na requisição
 */
interface RequestWithUser extends Request {
  user?: PrismaUser;
}

/**
 * Guard de autorização baseado em CASL
 * Verifica se o usuário autenticado possui as permissões necessárias
 * Funciona tanto para contextos HTTP quanto GraphQL
 */
@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  /**
   * Determina se a requisição pode prosseguir baseado nas permissões CASL
   * Extrai regras do decorator @CheckPermissions e verifica contra abilities do usuário
   * @param context - Contexto de execução da requisição (HTTP ou GraphQL)
   * @returns true se autorizado, lança exceção caso contrário
   * @throws {ForbiddenException} Se usuário não autenticado ou sem permissão
   * @throws {InternalServerErrorException} Se erro inesperado na verificação
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules =
      this.reflector.get<RequiredRule[]>(
        CHECK_PERMISSIONS_KEY,
        context.getHandler(),
      ) || [];

    // Se não há regras definidas, permite acesso
    if (!rules || rules.length === 0) {
      return true;
    }

    const user = this.getUserFromContext(context);

    if (!user) {
      throw new ForbiddenException(ERROR_MESSAGES.USER_NOT_IN_CONTEXT);
    }

    const ability: AppAbility =
      await this.caslAbilityFactory.createForUser(user);

    try {
      const hasPermission = rules.every((rule) => {
        // Garante que rule.subject seja um tipo esperado por AppAbility
        const subject = rule.subject;
        return ability.can(rule.action, subject);
      });

      if (!hasPermission) {
        throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Erro inesperado no CaslGuard:', error);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.PERMISSION_CHECK_ERROR,
      );
    }
  }

  /**
   * Extrai o usuário autenticado do contexto da requisição
   * Suporta tanto contextos HTTP (REST) quanto GraphQL
   * @param context - Contexto de execução da requisição
   * @returns Usuário autenticado ou null se não encontrado
   */
  private getUserFromContext(context: ExecutionContext): PrismaUser | null {
    let request: RequestWithUser | undefined;

    if (context.getType() === 'http') {
      request = context.switchToHttp().getRequest<RequestWithUser>();
    } else if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      // Acessa a requisição original dentro do contexto GraphQL
      request = ctx.getContext<{ req: RequestWithUser }>().req;
    } else {
      return null;
    }

    // Retorna o usuário anexado à requisição pelo guard de autenticação
    return request?.user ?? null;
  }
}
