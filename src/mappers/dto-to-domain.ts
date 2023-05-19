import { User as UserDto, UserProjection as UserProjectionDto } from "@prisma/client";
import { User } from "../models/user";
import { Metadata, SourceMetadata } from "../models/common";
import { DateTime } from "luxon";
import { UserProjection } from "../models/user-projection";


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
            new SourceMetadata())
    )
}

export function mapUserProjectionDtoToDomain(userProjectionDto: UserProjectionDto): UserProjection {
    return new UserProjection(
        userProjectionDto.userId,
        userProjectionDto.appId,
        userProjectionDto.isActive,
        userProjectionDto.alias,
        new Metadata(
            DateTime.fromJSDate(userProjectionDto.createdAt),
            DateTime.fromJSDate(userProjectionDto.updatedAt),
            new SourceMetadata())
    )
}
