import {
  Session as SessionDto,
  Secret as SecretDto,
  Device as DeviceDto,
} from "@prisma-dual-cli/generated/ssd-client";
import { Secret, SecretType } from "../models/secret";
import { Session } from "../models/session";
import { Device } from "../models/device";
import { DateTime } from "luxon";
import { Metadata, SourceMetadata } from "@shared/models/common";

export function mapSessionDtoToDomain(sessionDto: SessionDto): Session {
  return new Session(
    sessionDto.id,
    DateTime.fromJSDate(sessionDto.expiresAt),
    sessionDto.deviceId,
    sessionDto.userId,
    new Metadata(
      DateTime.fromJSDate(sessionDto.createdAt),
      DateTime.fromJSDate(sessionDto.updatedAt),
      new SourceMetadata()
    )
  );
}

export function mapSecretDtoToDomain(secretDto: SecretDto): Secret {
  return new Secret(
    secretDto.externalId,
    secretDto.type as SecretType,
    secretDto.passHash,
    secretDto.salt,
    new Metadata(
      DateTime.fromJSDate(secretDto.createdAt),
      DateTime.fromJSDate(secretDto.updatedAt),
      new SourceMetadata()
    )
  );
}

export function mapDeviceDtoToDomain(
  deviceDto: DeviceDto & { session?: SessionDto }
): Device {
  return new Device(
    deviceDto.id,
    deviceDto.session?.id ?? null,
    deviceDto.userAgent,
    deviceDto.ip
  );
}
