import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Controller principal da aplicação
 * Gerencia rotas básicas e de teste
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Endpoint de teste básico
   * @returns Mensagem de boas-vindas
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
