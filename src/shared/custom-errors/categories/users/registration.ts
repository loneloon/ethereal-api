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
