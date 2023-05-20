import { PrismaClient, User as UserDto } from "@prisma/client";
import { User } from "../models/user";
import _ from "lodash";
import { mapUserDtoToDomain } from "../mappers/dto-to-domain";


export interface CreateUserInputDto {
    email: string,
    username: string,
    firstName?: string,
    lastName?: string
}

// BE CAREFUL WITH FIELD NAMES IN THESE,
// THEY MUST MATCH THE SCHEMA EXACTLY
export interface UpdateUserInputDto {
    email?: string,
    emailIsVerified?: boolean,
    isActive?: boolean,
    username?: string,
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

        return mapUserDtoToDomain(newUserDto)
    }

    async getAllUsers(): Promise<User[]> {
        const allUsers: UserDto[] = await this.prismaClient.user.findMany()

        return allUsers.map((userDto) => mapUserDtoToDomain(userDto))
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

        return mapUserDtoToDomain(userDto)
    }
    
    async updateUser(id: string, updateUserInputDto: UpdateUserInputDto): Promise<User | null> {
        const oldUserDto = await this.prismaClient.user.findUnique({
            where: {
                id
            }
        })

        if (!oldUserDto) {
            console.warn(
                JSON.stringify({
                    message: `Couldn't find user with this id: ${id}`
                })
            )
            return null
        }

        // Removing possible undefined values from update input
        const validatedUpdateInput = Object.entries(updateUserInputDto).reduce((filtered, [key, value]) => {
            
            if ( value !== undefined ) {
                return {
                    ...filtered,
                    [key]: value
                }
            }
            return filtered
            
        }, {})

        let updatedUserDto: UserDto | null = null;

        try {
            updatedUserDto = await this.prismaClient.user.update({
                where: {
                    id
                },
                data: validatedUpdateInput
            })
        } catch(error) {
            console.warn(
                JSON.stringify(
                    {
                        message: `Skipping update for user with this id: ${id}`,
                        error,
                        validatedUpdateInput
                    }
                )
            )
            return null
        }

        return mapUserDtoToDomain(updatedUserDto)
    }

    /**
     * @deprecated Instead of hard deleting user records, deactivate them by setting 'isActive' flag to false
     */
    async deleteUser(id: string): Promise<User | null> {
        console.warn(JSON.stringify(
            {
                message: `Forcefully deleting user with this id: ${id}. Please consider deactivating users (soft-delete) next time instead of losing data :)`
            }
        ))

        let deletedUserDto: UserDto | null = null;

        try{
            deletedUserDto = await this.prismaClient.user.delete({
                where: {
                    id
                }
            })
        } catch(error) {
            console.warn(JSON.stringify({
                message: `Couldn't hard delete user with this id: ${id}`,
                error
            }))
            return null
        }
        
        return mapUserDtoToDomain(deletedUserDto)
    }
}
