import { DateTime } from "luxon";
import { Metadata } from "@shared/models/common";

export class Session {
  constructor(
    readonly id: string,
    readonly isActive: boolean,
    readonly expiresAt: DateTime,
    readonly deviceId: string,
    readonly metadata: Metadata
  ) {}

  get isExpired(): boolean {
    return DateTime.now() > this.expiresAt;
  }
}
