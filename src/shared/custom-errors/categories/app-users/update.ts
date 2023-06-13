import { CustomError } from "../base";

export class AppUserCannotBeReactivatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1140.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't reactivate the app user! Please reactivate the app user manually!";

  constructor(appId: string, userId: string) {
    super({ appId, userId });
  }
}

export class AppUserDoesntExistError extends CustomError {
  readonly httpCode: number = 404;
  readonly platformCode: string = "E1141";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string = "App user doesn't exist!";

  constructor(appId: string, userId: string) {
    super({ appId, userId });
  }
}
