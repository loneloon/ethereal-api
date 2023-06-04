import { CustomError } from "../base";

export class UserSecretCannotBeCreatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1010.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't create platform user's secret record!";

  constructor(userId: string) {
    super({ userId });
  }
}

export class UserAccountCannotBeCreatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1010.2";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't create platform user record for {email}!";

  constructor(email: string) {
    super({ email });
  }
}

export class UserAccountRollbackError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1010.3";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "[CRITICAL] User rollback operation failed! Investigate persistence service state ASAP!";

  constructor(email: string, userId: string) {
    super({ email, userId });
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

export class UserPasswordTooLongError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1012";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid password! Password can be {maxLength} characters long maximum!";

  constructor(maxLength: number, actualLength: number) {
    super({ maxLength, actualLength });
  }
}

export class UserPasswordInvalidFormatError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1013";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid password format! Password should contain at least one uppercase letter, one lowercase letter, one number and one special character";

  constructor() {
    super({});
  }
}

export class UserEmailInvalidFormatError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1014";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string = "Invalid email format!";

  constructor() {
    super({});
  }
}

export class UserEmailIsNotAvailableError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1015";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Email address is not available! It may be reserved, blacklisted or is being used by someone else! If you have previously signed up on the platform, please try logging in!";

  constructor() {
    super({});
  }
}
