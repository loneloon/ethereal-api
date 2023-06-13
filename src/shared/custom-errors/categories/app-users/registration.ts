import { CustomError } from "../base";

export class AppUserCannotBeCreatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1120.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't create app user record!";

  constructor(appId: string, userId: string) {
    super({ appId, userId });
  }
}

export class AppUserAlreadyExistsError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1121";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "User '{userEmail}' is already connected to '{appName}' app!";

  constructor(userEmail: string, appName: string) {
    super({ userEmail, appName });
  }
}
