import { CustomError } from "../base";

export class AppNameIsNotAvailableError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1091";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Application name '{appName}' is not available! It may be reserved, blacklisted or is already taken by someone else!";

  constructor(appName: string) {
    super({ appName });
  }
}
