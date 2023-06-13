import { CustomError } from "../base";

export class AppUserCannotBeDeactivatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1130.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't deactivate the app user! Please deactivate the app user manually!";

  constructor(appId: string, userId: string) {
    super({ appId, userId });
  }
}
