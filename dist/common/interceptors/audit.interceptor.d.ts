import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AuditActionType } from '../config/audit.config';
import { FeatureFlagsConfig } from '../config/feature-flags.config';
import { AuditService } from '../services/audit.service';
export declare const AUDIT_METADATA_KEY = "audit_metadata";
export declare const Audit: (action: AuditActionType, options?: {
    includeRequestBody?: boolean;
    includeResponseBody?: boolean;
    sensitiveFields?: string[];
}) => MethodDecorator;
export declare class AuditInterceptor implements NestInterceptor {
    private readonly auditService;
    private readonly featureFlags;
    private readonly reflector;
    private readonly logger;
    constructor(auditService: AuditService, featureFlags: FeatureFlagsConfig, reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private extractRequestInfo;
    private extractIpAddress;
    private sanitizeRequestData;
    private extractResourceName;
    private extractResourceId;
    private createSuccessAuditLog;
    private createErrorAuditLog;
    private sanitizeResponseData;
}
