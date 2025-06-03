import { Module } from '@nestjs/common';
import { RateLimitGuard } from './guards/rate-limit.guard';

/**
 * Módulo comum que exporta utilitários compartilhados
 * Guards, interceptors, pipes e outros componentes reutilizáveis
 */
@Module({
  providers: [RateLimitGuard],
  exports: [RateLimitGuard],
})
export class CommonModule {}
