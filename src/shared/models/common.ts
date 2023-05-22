import { DateTime } from "luxon";

export class Metadata {
  constructor(
    readonly creationTimestamp: DateTime,
    readonly updatedTimestamp: DateTime,
    readonly source: SourceMetadata
  ) {}
}

export class SourceMetadata {
  constructor(
    readonly system: string = "EtherealAPI::Local",
    readonly version: string = "0.0.1"
  ) {}
}
