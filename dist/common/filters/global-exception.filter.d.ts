import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
    private handleHttpException;
    private handleGraphQLException;
    private handleGenericException;
    private getHttpStatus;
    private getErrorMessage;
}
