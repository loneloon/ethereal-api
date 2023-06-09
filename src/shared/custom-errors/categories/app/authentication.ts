import { CustomError } from "../base";

export class AppHasNoAssociatedSecretError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1060.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "[CRITICAL] Registered application doesn't have a secret associated with it! This should never happen, please investigate current app registration flow ASAP!";

  constructor(appId: string) {
    super({ appId });
  }
}

export class InvalidAppAccessKeyError extends CustomError {
  readonly httpCode: number = 401;
  readonly platformCode: string = "E1061";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid application access key! Access denied!";

  constructor() {
    super({});
  }
}

export class InvalidAppCredentialsError extends CustomError {
  readonly httpCode: number = 401;
  readonly platformCode: string = "E1062";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid application credentials! Access keys will not be reset!";

  constructor() {
    super({});
  }
}

export class AppDoesntExistAnymoreError extends CustomError {
  readonly httpCode: number = 404;
  readonly platformCode: string = "E1063";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Application doesn't exist anymore!";

  constructor(appId: string) {
    super({ appId });
  }
}

export class AppDoesntExistAnymoreWithAccessKeysError extends CustomError {
  readonly httpCode: number = 404;
  readonly platformCode: string = "E1064";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Application doesn't exist anymore! Associated app keys have been invalidated!";

  constructor(appId: string) {
    super({ appId });
  }
}
