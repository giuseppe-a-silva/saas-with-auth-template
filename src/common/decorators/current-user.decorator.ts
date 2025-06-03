import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User as PrismaUser } from '@prisma/client'; // Importa o tipo User do Prisma
import { Request } from 'express';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

/**
 * Interface para estender o tipo Request com propriedade user
 * Permite tipagem segura do usuário autenticado na requisição
 */
interface RequestWithUser extends Request {
  user?: PrismaUser;
}

/**
 * Decorator para injeção do usuário autenticado nos parâmetros de métodos
 *
 * Extrai automaticamente o objeto `user` anexado à requisição pelo guard de autenticação
 * (JwtAuthGuard) e o injeta diretamente no parâmetro do método.
 *
 * Compatível com contextos HTTP (REST) e GraphQL.
 *
 * @example
 * ```typescript
 * @Query(() => User)
 * async me(@CurrentUser() user: User): Promise<User> {
 *   return user;
 * }
 * ```
 *
 * @throws {InternalServerErrorException} Se contexto não suportado ou usuário não encontrado
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): PrismaUser => {
    let request: RequestWithUser | undefined;

    if (context.getType() === 'http') {
      request = context.switchToHttp().getRequest<RequestWithUser>();
    } else if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      request = ctx.getContext<{ req: RequestWithUser }>().req;
    } else {
      // Lança erro se o tipo de contexto não for suportado
      throw new InternalServerErrorException(
        ERROR_MESSAGES.UNSUPPORTED_CONTEXT,
      );
    }

    const user = request?.user;

    // Se o usuário não for encontrado no contexto (o que não deveria acontecer após um guard de auth),
    // lança um erro.
    if (!user) {
      console.error(
        'CurrentUser decorator: Usuário não encontrado no contexto da requisição.',
      );
      throw new InternalServerErrorException(
        ERROR_MESSAGES.USER_NOT_IN_CONTEXT,
      );
    }

    return user;
  },
);
