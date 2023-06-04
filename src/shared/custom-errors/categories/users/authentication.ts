import { CustomError } from "../base";

export class UserAccountHasNoAssociatedSecretError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1000.1";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "[CRITICAL] Registered user doesn't have a password associated with the account! This should never happen, please investigate current sign-up flow ASAP!";

  constructor(userId: string) {
    super({ userId });
  }
}

export class UserSessionCannotBeDeletedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1000.2";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't terminate user session! Please remove the session record manually!";

  constructor(sessionId: string) {
    super({ sessionId });
  }
}

export class ExpiredUserSessionCannotBeDeletedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1000.3";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't delete expired session! Please remove the session manually!";

  constructor(sessionId: string) {
    super({ sessionId });
  }
}

export class UserDeviceCannotBeCreatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1000.4";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't create user device record!";

  constructor(userId: string, userAgent: string, ip: string) {
    super({ userId, userAgent, ip });
  }
}

export class UserSessionCannotBeCreatedError extends CustomError {
  readonly httpCode: number = 500;
  readonly platformCode: string = "E1000.5";
  protected readonly internalOnly: boolean = true;
  protected readonly messageTemplate: string =
    "Couldn't create platform user session!";

  constructor(userId: string, deviceId: string) {
    super({ userId, deviceId });
  }
}

export class UserIsNotAuthenticatedError extends CustomError {
  readonly httpCode: number = 401;
  readonly platformCode: string = "E1001";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string = "User is not signed in!";

  constructor() {
    super({});
  }
}

export class UserSessionHasExpiredError extends CustomError {
  readonly httpCode: number = 401;
  readonly platformCode: string = "E1002";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string = "User session has expired!";

  constructor() {
    super({});
  }
}

export class UserAccountDoesntExistAnymoreError extends CustomError {
  readonly httpCode: number = 404;
  readonly platformCode: string = "E1003";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "User account doesn't exist anymore!";

  constructor() {
    super({});
  }
}

export class UserAccountDoesntExistAnymoreWithSessionsError extends CustomError {
  readonly httpCode: number = 404;
  readonly platformCode: string = "E1004";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "User account doesn't exist anymore! Associated sessions have been terminated!";

  constructor() {
    super({});
  }
}

export class InvalidUserCredentialsError extends CustomError {
  readonly httpCode: number = 401;
  readonly platformCode: string = "E1005";
  protected readonly internalOnly: boolean = false;
  protected readonly messageTemplate: string =
    "Invalid credentials! Cannot sign in!";

  constructor() {
    super({});
  }
}
