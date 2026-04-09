import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { currencies } from 'src/context/wallet/infrastructure/currencies';

@ValidatorConstraint({ name: 'IsCurrencyCode', async: false })
class IsCurrencyCodeConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    const codes = currencies.map((c) => c.name);
    return codes.includes(value.toUpperCase());
  }

  defaultMessage() {
    const codes = currencies.map((c) => c.name).join(', ');
    return 'Currency must be one of: ' + codes;
  }
}

export function IsCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsCurrencyCodeConstraint,
    });
  };
}
