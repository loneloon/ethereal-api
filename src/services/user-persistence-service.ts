import { PrismaClient, User as UserDto } from "@prisma/client";
import { User } from "../models/user";

export interface CreateUserInputDto {
    email: string,
    username: string,
    firstName?: string,
    lastName?: string
}

export class UserPersistenceService {
    constructor(
        readonly prismaClient: PrismaClient
    ){}

    async createUser(createUserInputDto: CreateUserInputDto): Promise<User | null>{
        let newUserDto: UserDto | null = null;
        
        try {
            newUserDto = await this.prismaClient.user.create({
                data: {
                    // TODO: TRIP, VERIFY STRING FORMAT
                    email: createUserInputDto.email,
                    username: createUserInputDto.username,
                    firstName: createUserInputDto.firstName,
                    lastName: createUserInputDto.lastName
                }
            }
        )
        } catch(error) {
            console.warn(
                JSON.stringify(
                    {
                        message: "Couldn't create a user record!",
                        error,
                        createUserInputDto
                    }
                )
            )
            return null;
        }

        return new User(
            newUserDto.id,
            newUserDto.email,
            newUserDto.emailIsVerified,
            newUserDto.username,
            newUserDto.firstName,
            newUserDto.lastName
        )
    }

    async getAllUsers(): Promise<User[]> {
        const allUsers: UserDto[] = await this.prismaClient.user.findMany()

        return allUsers.map((userDto) => new User(
            userDto.id,
            userDto.email,
            userDto.emailIsVerified,
            userDto.username,
            userDto.firstName,
            userDto.lastName
        ))
    }

    async getUserById(id: string): Promise<User | null> {
        const userDto: UserDto | null = await this.prismaClient.user.findUnique(
            {
                where: {
                  id
                },
            }
        )
        
        if (!userDto) {
            console.warn(
                JSON.stringify({
                    message: `Couldn't find user with this id: ${id}`
                })
            )
            return null
        }

        return new User(
            userDto.id,
            userDto.email,
            userDto.emailIsVerified,
            userDto.username,
            userDto.firstName,
            userDto.lastName
        )
    }
}
