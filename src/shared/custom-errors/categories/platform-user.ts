import { CustomError } from "./base";

export class UserIsNotAuthenticatedError extends CustomError {
  readonly httpCode: number = 401;
  readonly platformCode: string = "E100";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string = "User is not signed in!";

  constructor() {
    super({});
  }
}
