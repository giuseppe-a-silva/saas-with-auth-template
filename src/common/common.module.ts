import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/prisma.module';
import { AuditConfig } from './config/audit.config';
import { FeatureFlagsConfig } from './config/feature-flags.config';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AuditService } from './services/audit.service';

/**
 * Módulo comum que exporta utilitários compartilhados
 * Guards, interceptors, pipes e outros componentes reutilizáveis
 */
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [RateLimitGuard, AuditService, AuditConfig, FeatureFlagsConfig],
  exports: [RateLimitGuard, AuditService, AuditConfig, FeatureFlagsConfig],
})
export class CommonModule {}
