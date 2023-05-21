import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import { 
    PrismaClient as PrismaSsdClient, 
    Session as SessionDto, 
    Prisma 
} from "@prisma-dual-cli/generated/ssd-client";


// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateSessionInputDto {
    expiresAt: Date,
    deviceId: string
}

export interface UpdateSessionInputDto {
    isActive: boolean
}


export class SessionPersistenceService extends PrismaBasedPersistenceService<
    PrismaSsdClient,
    Prisma.SessionDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>,
    SessionDto,
    CreateSessionInputDto,
    UpdateSessionInputDto
> {
    protected readonly entityTypeName: string = "Session";
    protected readonly modelAccessor: Prisma.SessionDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined> & { create: any; findMany: any; findUnique: any; update: any; delete: any; };
    protected readonly isPrimaryKeyComposite: boolean = true;

    constructor(
        readonly prismaClient: PrismaSsdClient
    ){
        super()
        this.modelAccessor = this.prismaClient.session
    }

    // TODO: CRUD
}
