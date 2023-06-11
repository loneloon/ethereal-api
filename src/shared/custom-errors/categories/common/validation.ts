import { CustomError } from "../base";

export class EmailInvalidFormatError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1051";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string = "Invalid email format!";

  constructor() {
    super({});
  }
}

export class MissingArgumentsError extends CustomError {
  readonly httpCode: number = 400;
  readonly platformCode: string = "E1052";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Missing arguments! Expected: {expectedArgs}";

  constructor(expectedArgs: string[]) {
    super({ expectedArgs });
  }
}
