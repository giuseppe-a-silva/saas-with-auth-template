import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Serviço de conexão com banco de dados Prisma
 * Gerencia o ciclo de vida da conexão com PostgreSQL
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Inicializa a conexão com o banco de dados
   * Executado automaticamente quando o módulo é carregado
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Finaliza a conexão com o banco de dados
   * Executado automaticamente quando a aplicação é encerrada
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
