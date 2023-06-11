import { CustomError } from "../base";

export class AppDoesntExistError extends CustomError {
  readonly httpCode: number = 404;
  readonly platformCode: string = "E1111";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Application '{appName}' doesn't exist!";

  constructor(appName: string) {
    super({ appName });
  }
}
