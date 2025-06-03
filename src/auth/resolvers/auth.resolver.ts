import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { User } from '../../users/entities/user.entity'; // Import User GraphQL entity
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import {
  AuthPayload,
  SimpleStatusPayload,
} from '../entities/auth-payload.entity';
import { RefreshJwtGuard } from '../guards/refresh-jwt.guard';

/**
 * Resolver GraphQL responsável pelas operações de autenticação
 * Gerencia login, registro, refresh de tokens e logout de usuários
 */
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  /**
   * Autentica um usuário usando email/username e senha
   * Define refresh token em cookie HttpOnly e retorna access token
   * @param loginDto - Dados de login (identifier + password)
   * @param context - Contexto GraphQL contendo objeto Response do Express
   * @returns Payload contendo o access token JWT
   * @throws {UnauthorizedException} Se as credenciais forem inválidas
   * @example
   * ```graphql
   * mutation {
   *   login(loginInput: { identifier: "user@example.com", password: "123456789" }) {
   *     accessToken
   *   }
   * }
   * ```
   */
  @Public() // Marca a mutação de login como pública
  @RateLimit({ windowMs: 60000, maxRequests: 5 }) // 5 tentativas por minuto
  @Mutation(() => AuthPayload, {
    description: 'Autentica usuário e retorna tokens de acesso',
  })
  async login(
    @Args('loginInput') loginDto: LoginDto,
    @Context() context: { res: Response }, // Acessa o objeto Response do Express via Contexto GraphQL
  ): Promise<AuthPayload> {
    // O AuthService lida com a validação e geração de tokens,
    // e também configura o cookie de refresh token na resposta (context.res)
    return this.authService.login(loginDto, context.res);
  }

  /**
   * Registra um novo usuário no sistema
   * Cria uma nova conta com email, username e senha
   * @param registerDto - Dados para criação do usuário
   * @returns Dados do usuário criado (sem a senha)
   * @throws {ConflictException} Se email ou username já existirem
   * @throws {InternalServerErrorException} Se houver erro interno
   * @example
   * ```graphql
   * mutation {
   *   register(registerInput: {
   *     email: "novo@example.com",
   *     username: "novousuario",
   *     password: "senhasegura123"
   *   }) {
   *     id
   *     email
   *     username
   *     role
   *   }
   * }
   * ```
   */
  @Public() // Marca a mutação de registro como pública
  @RateLimit({ windowMs: 300000, maxRequests: 3 }) // 3 tentativas por 5 minutos
  @Mutation(() => User, {
    description: 'Registra novo usuário no sistema',
  })
  async register(
    @Args('registerInput') registerDto: RegisterDto,
  ): Promise<Omit<User, 'password'>> {
    // O AuthService lida com a criação do usuário e hash da senha
    // Retorna o usuário criado (sem a senha)
    return this.authService.register(registerDto);
  }

  /**
   * Gera um novo access token usando o refresh token armazenado em cookie
   * Requer que o usuário tenha um refresh token válido
   * @param context - Contexto GraphQL contendo usuário validado pelo RefreshJwtGuard
   * @returns Novo access token JWT
   * @throws {UnauthorizedException} Se refresh token for inválido ou expirado
   * @example
   * ```graphql
   * mutation {
   *   refreshToken {
   *     accessToken
   *   }
   * }
   * ```
   */
  // A rota de refresh token usa o RefreshJwtGuard que extrai o token do cookie
  @UseGuards(RefreshJwtGuard)
  @Mutation(() => AuthPayload, {
    description:
      'Gera um novo token de acesso usando o refresh token (via cookie).',
  })
  async refreshToken(
    @Context() context: { req: { user: Omit<User, 'password'> } }, // Tipagem adequada do contexto
  ): Promise<AuthPayload> {
    // O RefreshJwtGuard já validou o refresh token e o usuário
    // O usuário validado está disponível em context.req.user
    const user = context.req.user;
    // Gera um novo access token
    return this.authService.refreshToken(user);
  }

  /**
   * Realiza o logout do usuário removendo o refresh token
   * Limpa o cookie HttpOnly que contém o refresh token
   * @param context - Contexto GraphQL contendo objeto Response do Express
   * @returns Status de sucesso da operação
   * @example
   * ```graphql
   * mutation {
   *   logout {
   *     success
   *     message
   *   }
   * }
   * ```
   */
  // O logout precisa limpar o cookie
  @Mutation(() => SimpleStatusPayload, {
    description:
      'Realiza o logout do usuário limpando o cookie de refresh token.',
  })
  logout(@Context() context: { res: Response }): SimpleStatusPayload {
    this.authService.logout(context.res);
    return { success: true, message: 'Logout realizado com sucesso.' };
  }
}
