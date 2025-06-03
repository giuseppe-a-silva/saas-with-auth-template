import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

/**
 * Módulo de configuração da aplicação
 * Gerencia variáveis de ambiente e configurações globais
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true, // Torna as variáveis de ambiente disponíveis globalmente
      envFilePath: '.env', // Especifica o arquivo .env
    }),
  ],
})
export class ConfigModule {}
