import { User as UserDto } from "@prisma/client";
import { User } from "../models/user";
import { Metadata, SourceMetadata } from "../models/common";
import { DateTime } from "luxon";


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
