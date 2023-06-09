import { CustomError } from "../base";

export class AppSecretCannotBeCreatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1070.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't create application secret record!";

  constructor(appId: string) {
    super({ appId });
  }
}

export class AppCannotBeCreatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1070.2";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't create new application record!";

  constructor(name: string, email: string, url: string) {
    super({ name, email, url });
  }
}

export class AppRollbackError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1070.3";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "[CRITICAL] Application rollback operation failed! Investigate persistence service state ASAP!";

  constructor(name: string, email: string, url: string) {
    super({ name, email, url });
  }
}
