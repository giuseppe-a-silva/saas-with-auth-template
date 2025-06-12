import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { useContainer } from 'class-validator';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { FeatureFlagsConfig } from './common/config/feature-flags.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditService } from './common/services/audit.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Configuração do logger global
  const logger = new Logger('Bootstrap');

  // Registra o filtro global de exceções
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Configuração de auditoria global
  const auditService = app.get(AuditService);
  const featureFlags = app.get(FeatureFlagsConfig);
  const reflector = app.get(Reflector);

  app.useGlobalInterceptors(
    new AuditInterceptor(auditService, featureFlags, reflector),
  );

  // Configura o class-validator para usar o container de DI do NestJS
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Habilita validação global usando class-validator e class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não definidas no DTO
      forbidNonWhitelisted: true, // Lança erro se propriedades não definidas forem enviadas
      transform: true, // Transforma o payload para instâncias de DTO
    }),
  );

  // Habilita o uso de cookies
  app.use(cookieParser());

  // Habilita CORS se necessário (ajuste as opções conforme a necessidade)
  // app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Aplicação está rodando na porta ${port}`);
  logger.log('Sistema de auditoria configurado globalmente');
}

// Adiciona tratamento de erro para a inicialização
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Erro ao iniciar a aplicação:', error);
  process.exit(1);
});
