import {
  Application as ApplicationDto,
  User as UserDto,
  UserProjection as UserProjectionDto,
} from "@prisma-dual-cli/generated/aup-client";
import { User } from "../models/user";
import { Metadata, SourceMetadata } from "@shared/models/common";
import { DateTime } from "luxon";
import { UserProjection } from "../models/user-projection";
import { Application } from "../models/application";

export function mapUserDtoToDomain(userDto: UserDto): User {
  return new User(
    userDto.id,
    userDto.email,
    userDto.emailIsVerified,
    userDto.username,
    userDto.isActive,
    userDto.firstName,
    userDto.lastName,
    new Metadata(
      DateTime.fromJSDate(userDto.createdAt),
      DateTime.fromJSDate(userDto.updatedAt),
      new SourceMetadata()
    )
  );
}

export function mapUserProjectionDtoToDomain(
  userProjectionDto: UserProjectionDto
): UserProjection {
  return new UserProjection(
    userProjectionDto.userId,
    userProjectionDto.appId,
    userProjectionDto.isActive,
    userProjectionDto.alias,
    userProjectionDto.appData ? JSON.parse(userProjectionDto.appData) : null,
    new Metadata(
      DateTime.fromJSDate(userProjectionDto.createdAt),
      DateTime.fromJSDate(userProjectionDto.updatedAt),
      new SourceMetadata()
    )
  );
}

export function mapApplicationDtoToDomain(
  applicationDto: ApplicationDto
): Application {
  return new Application(
    applicationDto.id,
    applicationDto.name,
    applicationDto.url,
    applicationDto.isActive,
    new Metadata(
      DateTime.fromJSDate(applicationDto.createdAt),
      DateTime.fromJSDate(applicationDto.updatedAt),
      new SourceMetadata()
    )
  );
}
