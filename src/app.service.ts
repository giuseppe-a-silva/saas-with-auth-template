import { Injectable } from '@nestjs/common';

/**
 * Serviço principal da aplicação
 * Fornece funcionalidades básicas e de teste
 */
@Injectable()
export class AppService {
  /**
   * Retorna uma mensagem de boas-vindas
   * @returns Mensagem de saudação simples
   */
  getHello(): string {
    return 'Hello World!';
  }
}
