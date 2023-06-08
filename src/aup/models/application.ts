import { Metadata } from "@shared/models/common";

export class Application {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly url: string,
    readonly email: string,
    readonly emailIsVerified: boolean,
    readonly isActive: boolean,
    readonly metadata: Metadata
  ) {}
}
