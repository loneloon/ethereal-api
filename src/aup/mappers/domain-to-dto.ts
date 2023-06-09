import {
  Application as ApplicationDto,
  User as UserDto,
  UserProjection as UserProjectionDto,
} from "@prisma-dual-cli/generated/aup-client";
import { User } from "../models/user";
import { Application } from "../models/application";
import { PublicApplicationViewDto } from "../dtos/application";

export function mapUserDomainToDto(
  user: User
): Omit<UserDto, "id" | "isActive"> {
  return {
    email: user.email,
    emailIsVerified: user.emailIsVerified,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.metadata.creationTimestamp.toJSDate(),
    updatedAt: user.metadata.creationTimestamp.toJSDate(),
  };
}

export function mapApplicationDomainToPublicApplicationViewDto(
  app: Application
): PublicApplicationViewDto {
  return {
    name: app.name,
    url: app.url,
  };
}

export function mapApplicationDomainToPrivateApplicationViewDto(
  app: Application
): Omit<ApplicationDto, "id" | "isActive"> {
  return {
    name: app.name,
    url: app.url,
    email: app.email,
    emailIsVerified: app.emailIsVerified,
    createdAt: app.metadata.creationTimestamp.toJSDate(),
    updatedAt: app.metadata.creationTimestamp.toJSDate(),
  };
}
