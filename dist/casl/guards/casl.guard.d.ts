import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl-ability.factory';
export declare class CaslGuard implements CanActivate {
    private reflector;
    private caslAbilityFactory;
    constructor(reflector: Reflector, caslAbilityFactory: CaslAbilityFactory);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private getUserFromContext;
}
