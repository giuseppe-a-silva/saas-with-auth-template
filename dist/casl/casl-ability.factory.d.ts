import { Ability, InferSubjects } from '@casl/ability';
import { User } from '@prisma/client';
import { Action } from '../permissions/entities/permission.entity';
import { PermissionsService } from '../permissions/permissions.service';
export type Subjects = InferSubjects<User> | 'User' | 'Post' | 'all';
export type AppAbility = Ability<[Action, Subjects]>;
export declare class CaslAbilityFactory {
    private readonly permissionsService;
    private readonly logger;
    constructor(permissionsService: PermissionsService);
    createForUser(user: Omit<User, 'password'>): Promise<AppAbility>;
}
