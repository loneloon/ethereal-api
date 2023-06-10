import { CustomError } from "../base";

export class UserAccountCannotBeDeactivatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1020.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't deactivate user account! Please deactivate the user account manually!";

  constructor(userId: string) {
    super({ userId });
  }
}

export class UserSecretCannotBeDeletedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1020.2";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't delete user's secret record!";

  constructor(userId: string) {
    super({ userId });
  }
}
