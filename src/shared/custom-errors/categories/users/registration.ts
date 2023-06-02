import { CustomError } from "../base";

export class UserPasswordHashCannotBeSavedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1010.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't create platform user's secret record!";

  constructor(userId: string) {
    super({ userId });
  }
}

export class UserPasswordTooShortError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1011";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid password! Password should be at least {minLength} characters long! Actual length: {actualLength}";

  constructor(minLength: number, actualLength: number) {
    super({ minLength, actualLength });
  }
}
