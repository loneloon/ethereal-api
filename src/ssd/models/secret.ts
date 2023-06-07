import { Metadata } from "@shared/models/common";

export type SecretType = "USER" | "APP";

export class Secret {
  constructor(
    readonly externalId: string,
    readonly type: SecretType,
    readonly passHash: string,
    readonly salt: string,
    readonly metadata: Metadata
  ) {}
}
