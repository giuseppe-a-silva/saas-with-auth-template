import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthResolver } from './auth/resolvers/auth.resolver';
import { CaslModule } from './casl/casl.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UsersResolver } from './users/resolvers/users.resolver';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    CaslModule,
    PermissionsModule,
    NotificationsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // Gera o schema automaticamente
      sortSchema: true, // Ordena o schema alfabeticamente
      playground: true, // Habilita o GraphQL Playground (ou Apollo Sandbox)
      introspection: true, // Permite introspecção (útil para ferramentas)
      // Contexto para passar a requisição (e resposta) para os resolvers
      // Isso é crucial para acessar cookies (refresh token) e o usuário anexado pelos guards
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
      }),
    }),
  ],
  controllers: [AppController],
  // Os resolvers são geralmente fornecidos pelos seus respectivos módulos (AuthModule, UsersModule)
  // Não precisam ser listados aqui se já estiverem nos providers desses módulos
  // Se não estiverem, adicione-os aqui ou nos providers dos módulos correspondentes
  providers: [AppService, AuthResolver, UsersResolver],
})
export class AppModule {}
