import { ValidationArguments, ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
import { PasswordService } from '../services/password.service';
export declare class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
    private readonly passwordService;
    constructor(passwordService: PasswordService);
    validate(value: string, _args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare function IsStrongPassword(validationOptions?: ValidationOptions): PropertyDecorator;
