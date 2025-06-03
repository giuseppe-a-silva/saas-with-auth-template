import { ValidationArguments, ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
export declare class IsValidEmailConstraint implements ValidatorConstraintInterface {
    validate(value: string, _args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
    private hasSuspiciousPatterns;
}
export declare function IsValidEmail(validationOptions?: ValidationOptions): PropertyDecorator;
