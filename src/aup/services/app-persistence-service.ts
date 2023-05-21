import { PrismaClient as PrismaAupClient, Application as ApplicationDto, Prisma } from "@prisma-dual-cli/generated/aup-client";
import { Application } from '../models/application'
import { mapApplicationDtoToDomain } from "../mappers/dto-to-domain";
import { PrismaBasedPersistenceService } from "../../shared/persistence-service";


export interface CreateApplicationInputDto {
    name: string,
    url: string
}

export interface UpdateApplicationInputDto {
    name: string,
    url: string,
    isActive: boolean
}

export class AppPersistenceService extends PrismaBasedPersistenceService<
    PrismaAupClient,
    Prisma.ApplicationDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>,
    ApplicationDto,
    CreateApplicationInputDto,
    UpdateApplicationInputDto
> {
    protected readonly entityTypeName: string = "Application"
    protected readonly modelAccessor: Prisma.ApplicationDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined> & { create: any; };
    protected readonly isPrimaryKeyComposite: boolean = false;

    constructor(
        readonly prismaClient: PrismaAupClient
    ){
        super()
        this.modelAccessor = this.prismaClient.application
    }

    async getApplicationById(id: string): Promise<Application | null> {
        const appDto: ApplicationDto | null = await this.prismaClient.application.findUnique({
            where: {
                id
            }
        })

        if (!appDto) {
            console.warn(JSON.stringify(
                {
                    message: `Couldn't find application record with this id: ${id}`
                }
            ))
            return null
        }

        return mapApplicationDtoToDomain(appDto)
    }

    async getAllApplications(): Promise<Application[]> {
        const appDtos: ApplicationDto[] = await this.prismaClient.application.findMany()

        return appDtos.map((appDto) => mapApplicationDtoToDomain(appDto))
    }

    async updateApplication(id: string, updateApplicationInputDto: UpdateApplicationInputDto) {
        const oldApplicationDto = await this.prismaClient.application.findUnique({
            where: {
                id
            }
        })

        if (!oldApplicationDto) {
            console.warn(
                JSON.stringify({
                    message: `Couldn't find application record with this id: ${id}`
                })
            )
            return null
        }

        // Removing possible undefined values from update input
        const validatedUpdateInput = Object.entries(updateApplicationInputDto).reduce((filtered, [key, value]) => {
            
            if ( value !== undefined ) {
                return {
                    ...filtered,
                    [key]: value
                }
            }
            return filtered
            
        }, {})

        let updatedApplicationDto: ApplicationDto | null = null;

        try {
            updatedApplicationDto = await this.prismaClient.application.update({
                where: {
                    id
                },
                data: validatedUpdateInput
            })
        } catch(error) {
            console.warn(
                JSON.stringify(
                    {
                        message: `Skipping update for application with this id: ${id}`,
                        error,
                        validatedUpdateInput
                    }
                )
            )
            return null
        }

        return mapApplicationDtoToDomain(updatedApplicationDto)
    }

    /**
     * @deprecated Instead of hard deleting application records, deactivate them by setting 'isActive' flag to false
     */
    async deleteApplication(id: string): Promise<Application | null> {
        console.warn(JSON.stringify(
            {
                message: `Forcefully deleting application with this id: ${id}. Please consider deactivating applications (soft-delete) next time instead of losing data :)`
            }
        ))

        let deletedApplicationDto: ApplicationDto | null = null;

        try{
            deletedApplicationDto = await this.prismaClient.application.delete({
                where: {
                    id
                }
            })
        } catch(error) {
            console.warn(JSON.stringify({
                message: `Couldn't hard delete application with this id: ${id}`,
                error
            }))
            return null
        }
        
        return mapApplicationDtoToDomain(deletedApplicationDto)
    }
}
