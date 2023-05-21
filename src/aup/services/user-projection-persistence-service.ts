import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import { 
    PrismaClient as PrismaAupClient, 
    UserProjection as UserProjectionDto, 
    Prisma 
} from "@prisma-dual-cli/generated/aup-client";


// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateUserProjectionInputDto {
    userId: string,
    appId: string,
    alias: string | null
}

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
    protected readonly modelAccessor: Prisma.UserProjectionDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>;
    protected readonly isPrimaryKeyComposite: boolean = true;

    constructor(
        readonly prismaClient: PrismaAupClient
    ){
        super()
        this.modelAccessor = this.prismaClient.userProjection
    }

    async createUserProjection(createUserProjectionInputDto: CreateUserProjectionInputDto): Promise<UserProjectionDto | null> {
        return await this.createEntity(createUserProjectionInputDto)
    }  

    async getAllProjections(): Promise<UserProjectionDto[]> {
        return await this.getAllEntities()
    }

    async getAllProjectionsByUserId(userId: string): Promise<UserProjectionDto[]> {
        return await this.searchEntities({
            userId
        })
    }

    async getAllProjectionsByAppId(appId: string): Promise<UserProjectionDto[]> {
        return await this.searchEntities({
            appId
        })
    }

    async getProjectionByAppAndUserId(appId: string, userId: string): Promise<UserProjectionDto | null> {
        return await this.getUniqueEntity("appId_userId", { appId, userId })
    }

    async updateUserProjection(appId: string, userId: string, updateUserProjectionInputDto: UpdateUserProjectionInputDto): Promise<UserProjectionDto | null> {
        return await this.updateEntity("appId_userId", { appId, userId }, updateUserProjectionInputDto)
    }

    /**
     * @deprecated Instead of hard deleting user projections, deactivate them by setting 'isActive' flag to false
     */
    async deleteUserProjection(appId: string, userId: string): Promise<UserProjectionDto | null> {
        return await this.deleteEntity("appId_userId", { appId, userId })
    }
}
