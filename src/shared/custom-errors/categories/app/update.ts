import { CustomError } from "../base";

export class AppSecretCannotBeUpdatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1080.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't update application secret record!";

  constructor(appId: string) {
    super({ appId });
  }
}

export class AppNameCannotBeUpdatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1080.2";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't update application name!";

  constructor(appId: string) {
    super({ appId });
  }
}
