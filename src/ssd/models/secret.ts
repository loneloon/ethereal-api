import { Metadata } from "@shared/models/common";

export class Secret {
  constructor(
    readonly userId: string,
    readonly passHash: string,
    readonly salt: string,
    readonly metadata: Metadata
  ) {}
}
