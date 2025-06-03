import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global de banco de dados
 * Fornece o PrismaService para toda a aplicação
 */
@Global() // Torna o PrismaService disponível globalmente para injeção em outros módulos
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Exporta o PrismaService para ser usado por outros módulos
})
export class DatabaseModule {}
