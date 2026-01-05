import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'MatchPassword', async: false })
export class MatchPassword implements ValidatorConstraintInterface {
  validate(property: string, value: ValidationArguments) {
    if (property !== (value.object as any)[value.constraints[0]]) return false;
    return true;
  }
  defaultMessage() {
    return 'Password do no match!';
  }
}
