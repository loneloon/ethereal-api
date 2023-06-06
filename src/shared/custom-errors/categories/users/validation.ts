import { CustomError } from "../base";

export class UserPasswordTooShortError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1031";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid password! Password should be at least {minLength} characters long! Actual length: {actualLength}";

  constructor(minLength: number, actualLength: number) {
    super({ minLength, actualLength });
  }
}

export class UserPasswordTooLongError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1032";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid password! Password can be {maxLength} characters long maximum!";

  constructor(maxLength: number, actualLength: number) {
    super({ maxLength, actualLength });
  }
}

export class UserPasswordInvalidFormatError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1033";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid password format! Password should contain at least one uppercase letter, one lowercase letter, one number and one special character";

  constructor() {
    super({});
  }
}

export class UserEmailInvalidFormatError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1034";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string = "Invalid email format!";

  constructor() {
    super({});
  }
}

export class UserEmailIsNotAvailableError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1035";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Email address is not available! It may be reserved, blacklisted or is being used by someone else! If you have previously signed up on the platform, please try logging in!";

  constructor() {
    super({});
  }
}

export class UsernameTooShortError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1036";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid username! Username should be at least {minLength} characters long!";

  constructor(minLength: number, actualLength: number) {
    super({ minLength, actualLength });
  }
}

export class UsernameTooLongError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1037";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid username! Username can be {maxLength} characters long maximum!";

  constructor(maxLength: number, actualLength: number) {
    super({ maxLength, actualLength });
  }
}

export class UsernameInvalidFormatError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1038";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid username format! Username can only contain upper/lowercase letters and digits!";

  constructor() {
    super({});
  }
}

export class UserNameInvalidFormatError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1039";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid name format! Only english letters and punctuation symbols (,.'-) may be included!";

  constructor() {
    super({});
  }
}
