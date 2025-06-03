import { Action } from '../../permissions/entities/permission.entity';
import { Subjects } from '../casl-ability.factory';
export interface RequiredRule {
    action: Action;
    subject: Subjects;
}
export declare const CHECK_PERMISSIONS_KEY = "check_permissions";
export declare const CheckPermissions: (...rules: RequiredRule[]) => MethodDecorator;
