import { PrismaClient as PrismaAupClient, User as UserDto, Prisma } from "@prisma-dual-cli/generated/aup-client";
import _ from "lodash";
import { PrismaBasedPersistenceService } from "../../shared/persistence-service";


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

export class UserPersistenceService extends PrismaBasedPersistenceService<
    PrismaAupClient,
    Prisma.UserDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>,
    UserDto,
    CreateUserInputDto,
    UpdateUserInputDto
> {
    protected readonly entityTypeName: string = "User"
    protected readonly modelAccessor: Prisma.UserDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined> & { create: any; };
    protected readonly isPrimaryKeyComposite: boolean = false

    constructor(
        readonly prismaClient: PrismaAupClient,
    ){
        super()
        this.modelAccessor = this.prismaClient.user
    }

    async createUser(createUserInputDto: CreateUserInputDto): Promise<UserDto| null> {
        return await this.createEntity(createUserInputDto)
    }

    async getAllUsers(): Promise<UserDto[]> {
        return await this.getAllEntities()
    }

    async getUserById(id: string): Promise<UserDto | null> {
        return this.getUniqueEntity("id", id)
    }
    
    async updateUser(id: string, updateUserInputDto: UpdateUserInputDto): Promise<UserDto | null> {
        return await this.updateEntity("id", id, updateUserInputDto)
    }

    /**
     * @deprecated Instead of hard deleting user records, deactivate them by setting 'isActive' flag to false
     */
    async deleteUser(id: string): Promise<UserDto | null> {
        return await this.deleteEntity("id", id)
    }
}
