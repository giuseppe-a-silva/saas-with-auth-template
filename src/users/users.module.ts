import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
// O DatabaseModule é global, então o PrismaService está disponível
// Não precisamos importar o DatabaseModule aqui explicitamente

/**
 * Módulo de gerenciamento de usuários
 * Fornece serviços para operações CRUD de usuários
 */
@Module({
  providers: [UsersService],
  exports: [UsersService], // Exporta UsersService para ser usado por outros módulos (ex: AuthModule)
})
export class UsersModule {}
