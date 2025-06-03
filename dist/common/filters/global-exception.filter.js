"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    catch(exception, host) {
        const contextType = host.getType();
        if (contextType === 'http') {
            this.handleHttpException(exception, host);
        }
        else if (contextType === 'graphql') {
            this.handleGraphQLException(exception);
        }
        else {
            this.handleGenericException(exception);
        }
    }
    handleHttpException(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = this.getHttpStatus(exception);
        const message = this.getErrorMessage(exception);
        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
        };
        this.logger.error('Exceção HTTP capturada', {
            ...errorResponse,
            stack: exception instanceof Error ? exception.stack : undefined,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
        });
        response.status(status).json(errorResponse);
    }
    handleGraphQLException(exception) {
        const message = this.getErrorMessage(exception);
        const status = this.getHttpStatus(exception);
        this.logger.error('Exceção GraphQL capturada', {
            message,
            statusCode: status,
            timestamp: new Date().toISOString(),
            stack: exception instanceof Error ? exception.stack : undefined,
        });
        throw exception;
    }
    handleGenericException(exception) {
        const message = this.getErrorMessage(exception);
        this.logger.error('Exceção genérica capturada', {
            message,
            timestamp: new Date().toISOString(),
            stack: exception instanceof Error ? exception.stack : undefined,
        });
    }
    getHttpStatus(exception) {
        if (exception instanceof common_1.HttpException) {
            return exception.getStatus();
        }
        return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
    }
    getErrorMessage(exception) {
        if (exception instanceof common_1.HttpException) {
            const response = exception.getResponse();
            if (typeof response === 'string') {
                return response;
            }
            if (typeof response === 'object' &&
                response !== null &&
                'message' in response) {
                const message = response.message;
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
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map