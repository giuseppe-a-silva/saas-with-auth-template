import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditActionType } from '@prisma/client';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { FeatureFlagsConfig } from '../config/feature-flags.config';
import { AuditService } from '../services/audit.service';
import { CreateAuditLogInput } from '../types/audit.types';

export const AUDIT_METADATA_KEY = 'audit_metadata';

/**
 * Decorator para marcar endpoints que devem ser auditados
 * @param action - Tipo de ação de auditoria
 * @param options - Opções adicionais de auditoria
 */
export const Audit = (
  action: AuditActionType,
  options?: {
    includeRequestBody?: boolean;
    includeResponseBody?: boolean;
    sensitiveFields?: string[];
  },
): MethodDecorator => SetMetadata(AUDIT_METADATA_KEY, { action, options });

/**
 * Interceptador responsável por capturar e auditar ações sensíveis
 * Funciona automaticamente em endpoints marcados com @Audit()
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly featureFlags: FeatureFlagsConfig,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Intercepta requisições para endpoints marcados com @Audit
   * @param context - Contexto de execução do NestJS
   * @param next - Handler da próxima etapa
   * @returns Observable com resultado da operação
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Verifica se auditoria está habilitada
    if (!this.featureFlags.enableAuditSystem) {
      return next.handle();
    }

    // Busca metadados de auditoria do endpoint
    const auditMetadata = this.reflector.getAllAndOverride<{
      action: AuditActionType;
      options?: Record<string, unknown>;
    }>(AUDIT_METADATA_KEY, [context.getHandler(), context.getClass()]);

    // Se não há metadados de auditoria, prossegue sem auditar
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Extrai informações da requisição
    const auditContext = this.extractRequestInfo(request, auditMetadata);

    return next.handle().pipe(
      tap((responseData) => {
        // Sucesso - cria log de auditoria
        this.createSuccessAuditLog(
          auditMetadata,
          auditContext,
          response,
          responseData,
          startTime,
        );
      }),
      catchError((error) => {
        // Erro - cria log de auditoria de falha
        this.createErrorAuditLog(
          auditMetadata,
          auditContext,
          response,
          error,
          startTime,
        );
        throw error; // Re-propaga o erro
      }),
    );
  }

  /**
   * Extrai informações relevantes da requisição
   * @param request - Objeto Request do Express
   * @param auditMetadata - Metadados de auditoria
   * @returns Informações estruturadas da requisição
   * @private
   */
  private extractRequestInfo(
    request: Request,
    auditMetadata: {
      action: AuditActionType;
      options?: Record<string, unknown>;
    },
  ): Partial<CreateAuditLogInput> {
    interface RequestWithUser extends Request {
      user?: {
        id?: string;
        sub?: string;
      };
    }

    const requestWithUser = request as RequestWithUser;
    const user = requestWithUser.user;
    const userAgent = request.get('User-Agent') ?? 'Unknown';
    const ipAddress = this.extractIpAddress(request);

    let requestData: Record<string, unknown> | undefined;

    // Inclui dados da requisição se configurado
    if (auditMetadata.options?.includeRequestBody) {
      const sensitiveFields = auditMetadata.options?.sensitiveFields as
        | string[]
        | undefined;
      requestData = {
        body: this.sanitizeRequestData(
          request.body as Record<string, unknown>,
          sensitiveFields,
        ),
        query: request.query,
        params: request.params,
      };
    }

    return {
      userId: user?.id ?? user?.sub,
      action: auditMetadata.action,
      ipAddress,
      userAgent,
      endpoint: request.path,
      method: request.method,
      requestData,
      resource: this.extractResourceName(request.path),
      resourceId: this.extractResourceId(request.params),
    };
  }

  /**
   * Extrai endereço IP real da requisição
   * @param request - Objeto Request do Express
   * @returns Endereço IP
   * @private
   */
  private extractIpAddress(request: Request): string {
    return (
      (request.get('x-forwarded-for') ?? '').split(',').shift() ??
      request.get('x-real-ip') ??
      request.socket.remoteAddress ??
      'unknown'
    );
  }

  /**
   * Sanitiza dados da requisição removendo campos sensíveis
   * @param data - Dados a serem sanitizados
   * @param sensitiveFields - Lista de campos sensíveis
   * @returns Dados sanitizados
   * @private
   */
  private sanitizeRequestData(
    data: Record<string, unknown>,
    sensitiveFields: string[] = ['password', 'currentPassword', 'newPassword'],
  ): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Extrai nome do recurso baseado no path
   * @param path - Path da requisição
   * @returns Nome do recurso
   * @private
   */
  private extractResourceName(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[0] || 'unknown';
  }

  /**
   * Extrai ID do recurso dos parâmetros
   * @param params - Parâmetros da requisição
   * @returns ID do recurso
   * @private
   */
  private extractResourceId(
    params: Record<string, string>,
  ): string | undefined {
    return params.id || params.userId || params.resourceId;
  }

  /**
   * Cria log de auditoria para operação bem-sucedida
   * @param auditMetadata - Metadados de auditoria
   * @param auditContext - Contexto da requisição
   * @param response - Objeto Response do Express
   * @param responseData - Dados da resposta
   * @param startTime - Timestamp de início
   * @private
   */
  private createSuccessAuditLog(
    auditMetadata: {
      action: AuditActionType;
      options?: Record<string, unknown>;
    },
    auditContext: Partial<CreateAuditLogInput>,
    response: Response,
    responseData: unknown,
    startTime: number,
  ): void {
    const responseTime = Date.now() - startTime;
    let sanitizedResponseData: Record<string, unknown> | undefined;

    // Inclui dados da resposta se configurado
    if (auditMetadata.options?.includeResponseBody && responseData) {
      sanitizedResponseData = this.sanitizeResponseData(responseData);
    }

    const auditLog: CreateAuditLogInput = {
      ...auditContext,
      action: auditMetadata.action,
      statusCode: response.statusCode,
      responseData: sanitizedResponseData,
      metadata: {
        responseTime,
        success: true,
      },
    };

    // Cria log de forma assíncrona para não afetar performance
    setImmediate(() => {
      this.auditService.createAuditLog(auditLog).catch((error) => {
        this.logger.error('Erro ao criar log de auditoria de sucesso:', error);
      });
    });
  }

  /**
   * Cria log de auditoria para operação com erro
   * @param auditMetadata - Metadados de auditoria
   * @param auditContext - Contexto da requisição
   * @param response - Objeto Response do Express
   * @param error - Erro ocorrido
   * @param startTime - Timestamp de início
   * @private
   */
  private createErrorAuditLog(
    auditMetadata: {
      action: AuditActionType;
      options?: Record<string, unknown>;
    },
    auditContext: Partial<CreateAuditLogInput>,
    response: Response,
    error: unknown,
    startTime: number,
  ): void {
    const responseTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';

    const auditLog: CreateAuditLogInput = {
      ...auditContext,
      action: auditMetadata.action,
      statusCode: response.statusCode || 500,
      responseData: {
        error: errorMessage,
        success: false,
      },
      metadata: {
        responseTime,
        success: false,
        errorDetails: errorMessage,
      },
    };

    // Cria log de forma assíncrona
    setImmediate(() => {
      this.auditService.createAuditLog(auditLog).catch((auditError) => {
        this.logger.error(
          'Erro ao criar log de auditoria de erro:',
          auditError,
        );
      });
    });
  }

  /**
   * Sanitiza dados da resposta removendo informações sensíveis
   * @param responseData - Dados da resposta
   * @returns Dados sanitizados
   * @private
   */
  private sanitizeResponseData(responseData: unknown): Record<string, unknown> {
    if (!responseData || typeof responseData !== 'object') {
      return { type: typeof responseData };
    }

    const sanitized = { ...responseData } as Record<string, unknown>;

    // Remove campos sensíveis comuns
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
