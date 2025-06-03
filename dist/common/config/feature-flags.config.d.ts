import { ConfigService } from '@nestjs/config';
export declare class FeatureFlagsConfig {
    private readonly configService;
    constructor(configService: ConfigService);
    get enableAuditSystem(): boolean;
    get enableStrongPasswordValidation(): boolean;
    getAllFlags(): Record<string, boolean>;
}
