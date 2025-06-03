import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
// Novos serviços especializados
import { AuthenticationService } from './services/authentication.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
// Validators customizados
import { IsValidEmailConstraint } from './validators/email.validator';
import { IsStrongPasswordConstraint } from './validators/strong-password.validator';

/**
 * Módulo de autenticação e autorização
 * Gerencia JWT, estratégias Passport e serviços de autenticação
 * Utiliza nova arquitetura com serviços especializados
 */
@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        // Configurações globais do JwtModule podem ser sobrescritas no signAsync
      }),
    }),
    ConfigModule,
  ],
  providers: [
    // Serviço principal (refatorado - apenas orquestração)
    AuthService,

    // Estratégias JWT
    JwtStrategy,
    RefreshJwtStrategy,

    // Serviços especializados da nova arquitetura
    TokenService,
    PasswordService,
    AuthenticationService,

    // Validators customizados
    IsStrongPasswordConstraint,
    IsValidEmailConstraint,
  ],
  exports: [
    AuthService,
    JwtModule,
    // Exporta serviços especializados para uso em outros módulos
    TokenService,
    PasswordService,
    AuthenticationService,
  ],
})
export class AuthModule {}
