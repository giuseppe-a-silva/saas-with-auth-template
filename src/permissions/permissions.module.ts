import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
// O DatabaseModule é global, então o PrismaService está disponível

/**
 * Módulo de gerenciamento de permissões
 * Fornece serviços para consulta e manipulação de permissões de usuários
 */
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService], // Exporta para ser usado pela CaslAbilityFactory
})
export class PermissionsModule {}
