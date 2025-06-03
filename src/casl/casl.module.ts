import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module'; // Importa o módulo que fornece PermissionsService
import { CaslAbilityFactory } from './casl-ability.factory';

/**
 * Módulo de autorização CASL
 * Gerencia a criação de abilities e verificação de permissões
 * Integra com o sistema de permissões baseado em banco de dados
 */
@Module({
  imports: [PermissionsModule], // Importa PermissionsModule para que CaslAbilityFactory possa injetar PermissionsService
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory], // Exporta a factory para ser usada em guards ou onde for necessário
})
export class CaslModule {}
