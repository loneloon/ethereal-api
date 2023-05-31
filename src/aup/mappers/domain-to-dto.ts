import {
  Application as ApplicationDto,
  User as UserDto,
  UserProjection as UserProjectionDto,
} from "@prisma-dual-cli/generated/aup-client";
import { User } from "../models/user";

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
