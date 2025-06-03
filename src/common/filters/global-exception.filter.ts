import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global para capturar e tratar todas as exceções da aplicação
 * Fornece logs estruturados e respostas padronizadas
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  /**
   * Captura e trata exceções globalmente
   * @param exception - A exceção capturada
   * @param host - Contexto da requisição (HTTP ou GraphQL)
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const contextType = host.getType<string>();

    if (contextType === 'http') {
      this.handleHttpException(exception, host);
    } else if (contextType === 'graphql') {
      this.handleGraphQLException(exception);
    } else {
      this.handleGenericException(exception);
    }
  }

  /**
   * Trata exceções em contexto HTTP
   * @param exception - A exceção capturada
   * @param host - Contexto HTTP
   */
  private handleHttpException(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const message = this.getErrorMessage(exception);

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Log estruturado da exceção
    this.logger.error('Exceção HTTP capturada', {
      ...errorResponse,
      stack: exception instanceof Error ? exception.stack : undefined,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    response.status(status).json(errorResponse);
  }

  /**
   * Trata exceções em contexto GraphQL
   * @param exception - A exceção capturada
   */
  private handleGraphQLException(exception: unknown): void {
    const message = this.getErrorMessage(exception);
    const status = this.getHttpStatus(exception);

    // Log estruturado da exceção GraphQL
    this.logger.error('Exceção GraphQL capturada', {
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Para GraphQL, a exceção será propagada e tratada pelo Apollo Server
    throw exception;
  }

  /**
   * Trata exceções genéricas (não HTTP nem GraphQL)
   * @param exception - A exceção capturada
   */
  private handleGenericException(exception: unknown): void {
    const message = this.getErrorMessage(exception);

    this.logger.error('Exceção genérica capturada', {
      message,
      timestamp: new Date().toISOString(),
      stack: exception instanceof Error ? exception.stack : undefined,
    });
  }

  /**
   * Extrai o status HTTP da exceção
   * @param exception - A exceção
   * @returns Status HTTP apropriado
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Extrai a mensagem de erro da exceção
   * @param exception - A exceção
   * @returns Mensagem de erro apropriada
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const message = (response as { message: unknown }).message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (typeof message === 'string') {
          return message;
        }
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Erro interno do servidor';
  }
}
