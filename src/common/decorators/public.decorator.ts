import { SetMetadata } from '@nestjs/common';

// Chave para identificar metadados de rotas públicas
export const IS_PUBLIC_KEY = 'isPublic';

// Decorator para marcar um endpoint como público (não requer autenticação JWT)
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
