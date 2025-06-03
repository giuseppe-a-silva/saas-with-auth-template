import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { AuditActionType, User as PrismaUser } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { User } from '../../users/entities/user.entity'; // Import User GraphQL entity
import { AuthService } from '../auth.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import {
  AuthPayload,
  SimpleStatusPayload,
} from '../entities/auth-payload.entity';
import { RefreshJwtGuard } from '../guards/refresh-jwt.guard';
import { EmailVerificationService } from '../services/email-verification.service';
import { PasswordResetService } from '../services/password-reset.service';

/**
 * Resolver GraphQL responsável pelas operações de autenticação
 * Gerencia login, registro, refresh de tokens e logout de usuários
 */
@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

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
  @Audit(AuditActionType.USER_LOGIN, {
    includeRequestBody: true,
    sensitiveFields: ['password'],
  })
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
  @Audit(AuditActionType.USER_REGISTER, {
    includeRequestBody: true,
    sensitiveFields: ['password'],
  })
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
   * Verifica o email do usuário usando token de verificação
   * @param verifyEmailDto - Dados contendo o token de verificação
   * @returns Status de sucesso da verificação
   * @throws {BadRequestException} Se token for inválido ou expirado
   * @example
   * ```graphql
   * mutation {
   *   verifyEmail(verifyEmailInput: { token: "abc123..." }) {
   *     success
   *     message
   *   }
   * }
   * ```
   */
  @Public() // Verificação de email é pública
  @RateLimit({ windowMs: 3600000, maxRequests: 10 }) // 10 tentativas por hora
  @Audit(AuditActionType.EMAIL_VERIFICATION, {
    includeRequestBody: true,
  })
  @Mutation(() => SimpleStatusPayload, {
    description: 'Verifica o email do usuário usando token de verificação',
  })
  async verifyEmail(
    @Args('verifyEmailInput') verifyEmailDto: VerifyEmailDto,
  ): Promise<SimpleStatusPayload> {
    const success = await this.emailVerificationService.verifyEmailToken(
      verifyEmailDto.token,
    );

    return {
      success,
      message: success
        ? 'Email verificado com sucesso! Agora você pode fazer login.'
        : 'Falha na verificação do email.',
    };
  }

  /**
   * Inicia processo de recuperação de senha
   * @param forgotPasswordDto - Dados contendo o email do usuário
   * @returns Status sempre bem-sucedido (por segurança)
   * @example
   * ```graphql
   * mutation {
   *   forgotPassword(forgotPasswordInput: { email: "user@example.com" }) {
   *     success
   *     message
   *   }
   * }
   * ```
   */
  @Public() // Recuperação de senha é pública
  @RateLimit({ windowMs: 3600000, maxRequests: 3 }) // 3 tentativas por hora por IP
  @Audit(AuditActionType.PASSWORD_RESET_REQUEST, {
    includeRequestBody: true,
  })
  @Mutation(() => SimpleStatusPayload, {
    description: 'Inicia processo de recuperação de senha',
  })
  async forgotPassword(
    @Args('forgotPasswordInput') forgotPasswordDto: ForgotPasswordDto,
  ): Promise<SimpleStatusPayload> {
    await this.passwordResetService.forgotPassword(forgotPasswordDto.email);

    return {
      success: true,
      message:
        'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.',
    };
  }

  /**
   * Redefine a senha usando token de recuperação
   * @param resetPasswordDto - Dados contendo token e nova senha
   * @returns Status de sucesso da redefinição
   * @throws {BadRequestException} Se token for inválido ou expirado
   * @example
   * ```graphql
   * mutation {
   *   resetPassword(resetPasswordInput: {
   *     token: "abc123...",
   *     newPassword: "novaSenhaSegura123"
   *   }) {
   *     success
   *     message
   *   }
   * }
   * ```
   */
  @Public() // Redefinição de senha é pública
  @RateLimit({ windowMs: 3600000, maxRequests: 5 }) // 5 tentativas por hora
  @Audit(AuditActionType.PASSWORD_RESET_CONFIRM, {
    includeRequestBody: true,
    sensitiveFields: ['newPassword'],
  })
  @Mutation(() => SimpleStatusPayload, {
    description: 'Redefine a senha usando token de recuperação',
  })
  async resetPassword(
    @Args('resetPasswordInput') resetPasswordDto: ResetPasswordDto,
  ): Promise<SimpleStatusPayload> {
    const success = await this.passwordResetService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return {
      success,
      message: success
        ? 'Senha redefinida com sucesso! Agora você pode fazer login com a nova senha.'
        : 'Falha na redefinição da senha.',
    };
  }

  /**
   * Altera a senha de um usuário autenticado
   * @param changePasswordDto - Dados contendo senha atual e nova senha
   * @param user - Usuário atual autenticado
   * @returns Status de sucesso da alteração
   * @throws {UnauthorizedException} Se senha atual estiver incorreta
   * @example
   * ```graphql
   * mutation {
   *   changePassword(changePasswordInput: {
   *     currentPassword: "senhaAtual123",
   *     newPassword: "novaSenhaSegura456"
   *   }) {
   *     success
   *     message
   *   }
   * }
   * ```
   */
  @RateLimit({ windowMs: 3600000, maxRequests: 5 }) // 5 tentativas por hora por usuário
  @Audit(AuditActionType.PASSWORD_CHANGE, {
    includeRequestBody: true,
    sensitiveFields: ['currentPassword', 'newPassword'],
  })
  @Mutation(() => SimpleStatusPayload, {
    description: 'Altera a senha de um usuário autenticado',
  })
  async changePassword(
    @Args('changePasswordInput') changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: Omit<PrismaUser, 'password'>,
  ): Promise<SimpleStatusPayload> {
    const success = await this.authService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    return {
      success,
      message: success
        ? 'Senha alterada com sucesso!'
        : 'Falha na alteração da senha.',
    };
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
  @Audit(AuditActionType.TOKEN_REFRESH)
  @Mutation(() => AuthPayload, {
    description:
      'Gera um novo token de acesso usando o refresh token (via cookie).',
  })
  async refreshToken(
    @Context() context: { req: { user: Omit<PrismaUser, 'password'> } }, // Tipagem adequada do contexto para Prisma User
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
  @Audit(AuditActionType.USER_LOGOUT)
  @Mutation(() => SimpleStatusPayload, {
    description:
      'Realiza o logout do usuário limpando o cookie de refresh token.',
  })
  logout(@Context() context: { res: Response }): SimpleStatusPayload {
    this.authService.logout(context.res);
    return { success: true, message: 'Logout realizado com sucesso.' };
  }
}
