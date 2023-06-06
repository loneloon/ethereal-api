import { CustomError } from "../base";

export class UserEmailCannotBeUpdatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1040.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't update platform user's email!";

  constructor(userId: string) {
    super({ userId });
  }
}

export class UserSecretCannotBeUpdatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1040.2";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't update platform user's secret record!";

  constructor(userId: string) {
    super({ userId });
  }
}

export class UserUsernameCannotBeUpdatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1040.3";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't update platform user's username!";

  constructor(userId: string) {
    super({ userId });
  }
}

export class UserNameCannotBeUpdatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1040.4";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't update platform user's name!";

  constructor(userId: string) {
    super({ userId });
  }
}

export class InvalidOldPasswordInputError extends CustomError {
  readonly httpCode: number = 401;
  readonly platformCode: string = "E1041";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Old password input is invalid! Cannot change the password!";

  constructor() {
    super({});
  }
}
