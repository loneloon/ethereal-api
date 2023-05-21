import { PrismaClient as PrismaAupClient, UserProjection as UserProjectionDto, Prisma } from "@prisma-dual-cli/generated/aup-client";
import { UserProjection } from "../models/user-projection";
import { mapUserProjectionDtoToDomain } from "../mappers/dto-to-domain";
import { PrismaBasedPersistenceService } from "../../shared/persistence-service";


export interface CreateUserProjectionInputDto {
    userId: string,
    appId: string,
    alias: string | null
}

// BE CAREFUL WITH FIELD NAMES IN THESE,
// THEY MUST MATCH THE SCHEMA EXACTLY
export interface UpdateUserProjectionInputDto {
    isActive: boolean,
    alias: string | null
}

export class UserProjectionPersistenceService extends PrismaBasedPersistenceService<
    PrismaAupClient,
    Prisma.UserProjectionDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>,
    UserProjectionDto,
    CreateUserProjectionInputDto,
    UpdateUserProjectionInputDto
> {
    protected readonly entityTypeName: string = "UserProjection"
    protected readonly modelAccessor: Prisma.UserProjectionDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined> & { create: any; };
    protected readonly isPrimaryKeyComposite: boolean = true;

    constructor(
        readonly prismaClient: PrismaAupClient
    ){
        super()
        this.modelAccessor = this.prismaClient.userProjection
    }

    async getAllProjections(): Promise<UserProjection[]> {
        const allUserProjections: UserProjectionDto[] = await this.prismaClient.userProjection.findMany()

        return allUserProjections.map((userProjectionDto) => mapUserProjectionDtoToDomain(userProjectionDto))
    }

    async getAllProjectionsByUserId(userId: string): Promise<UserProjection[]> {
        const allProjectionsByUserId: UserProjectionDto[] = await this.prismaClient.userProjection.findMany({
            where: {
                userId
            }
        })

        return allProjectionsByUserId.map((userProjectionDto) => mapUserProjectionDtoToDomain(userProjectionDto))
    }

    async getAllProjectionsByAppId(appId: string): Promise<UserProjection[]> {
        const allProjectionsByAppId: UserProjectionDto[] = await this.prismaClient.userProjection.findMany({
            where: {
                appId
            }
        })

        return allProjectionsByAppId.map((userProjectionDto) => mapUserProjectionDtoToDomain(userProjectionDto))
    }

    async getProjectionByAppAndUserId(appId: string, userId: string): Promise<UserProjection | null> {
        const userProjectionDto: UserProjectionDto | null = await this.prismaClient.userProjection.findUnique({
            where: {
                appId_userId: {
                    appId,
                    userId
                }
            }
        })

        if (!userProjectionDto) {
            console.warn(
                JSON.stringify({
                    message: "Couldn't find user projection!",
                    appId,
                    userId
                })
            )
            return null
        }

        return mapUserProjectionDtoToDomain(userProjectionDto)
    }

    async updateUserProjection(appId: string, userId: string, updateUserProjectionInputDto: UpdateUserProjectionInputDto): Promise<UserProjection | null> {
        const oldUserProjectionDto = await this.prismaClient.userProjection.findUnique({
            where: {
                appId_userId: {
                    appId,
                    userId
                }
            }
        })

        if (!oldUserProjectionDto) {
            console.warn(
                JSON.stringify({
                    message: `Couldn't find user projection!`,
                    appId,
                    userId
                })
            )
            return null
        }

        // Removing possible undefined values from update input
        const validatedUpdateInput = Object.entries(updateUserProjectionInputDto).reduce((filtered, [key, value]) => {
            
            if ( value !== undefined ) {
                return {
                    ...filtered,
                    [key]: value
                }
            }
            return filtered
            
        }, {})

        let updatedUserProjectionDto: UserProjectionDto | null = null;

        try {
            updatedUserProjectionDto = await this.prismaClient.userProjection.update({
                where: {
                    appId_userId: {
                        appId,
                        userId
                    }
                },
                data: validatedUpdateInput
            })
        } catch(error) {
            console.warn(
                JSON.stringify(
                    {
                        message: `Skipping update for user projection!`,
                        appId,
                        userId,
                        error,
                        validatedUpdateInput
                    }
                )
            )
            return null
        }

        return mapUserProjectionDtoToDomain(updatedUserProjectionDto)
    }

    /**
     * @deprecated Instead of hard deleting user projections, deactivate them by setting 'isActive' flag to false
     */
    async deleteUserProjection(appId: string, userId: string): Promise<UserProjection | null> {
        console.warn(JSON.stringify(
            {
                message: `Forcefully deleting user projection. Please consider deactivating user projections (soft-delete) next time instead of losing data :)`,
                appId,
                userId
            }
        ))

        let deletedUserProjectionDto: UserProjectionDto | null = null;

        try{
            deletedUserProjectionDto = await this.prismaClient.userProjection.delete({
                where: {
                    appId_userId: {
                        appId,
                        userId
                    }
                }
            })
        } catch(error) {
            console.warn(JSON.stringify({
                message: `Couldn't hard delete user projection!`,
                appId,
                userId,
                error
            }))
            return null
        }
        
        return mapUserProjectionDtoToDomain(deletedUserProjectionDto)
    }
}
