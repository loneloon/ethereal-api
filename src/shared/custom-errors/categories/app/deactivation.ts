import { CustomError } from "../base";

export class AppSecretCannotBeDeletedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1100.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't delete application secret record!";

  constructor(appId: string) {
    super({ appId });
  }
}
