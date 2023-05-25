import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import {
  PrismaClient as PrismaSsdClient,
  Session as SessionDto,
  Prisma,
} from "@prisma-dual-cli/generated/ssd-client";

// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateSessionInputDto {
  expiresAt: Date;
  deviceId: string;
  userId: string;
}

export interface UpdateSessionInputDto {
  isActive?: boolean;
}

export class SessionPersistenceService extends PrismaBasedPersistenceService<
  PrismaSsdClient,
  Prisma.SessionDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >,
  SessionDto,
  CreateSessionInputDto,
  UpdateSessionInputDto
> {
  protected readonly entityTypeName: string = "Session";
  protected readonly modelAccessor: Prisma.SessionDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  > & { create: any; findMany: any; findUnique: any; update: any; delete: any };
  protected readonly isPrimaryKeyComposite: boolean = false;

  constructor(readonly prismaClient: PrismaSsdClient) {
    super();
    this.modelAccessor = this.prismaClient.session;
  }

  async createSession(
    createSessionInputDto: CreateSessionInputDto
  ): Promise<SessionDto | null> {
    return await this.createEntity(createSessionInputDto);
  }

  async getSessionById(id: string): Promise<SessionDto | null> {
    return await this.getUniqueEntity("id", id);
  }

  async getSessionsByUserId(userId: string): Promise<SessionDto[]> {
    return await this.searchEntities({ userId });
  }

  async getSessionsByDeviceId(deviceId: string): Promise<SessionDto[]> {
    return await this.searchEntities({ deviceId });
  }

  async getAllSessions(): Promise<SessionDto[]> {
    return await this.getAllEntities();
  }

  async updateSession(
    id: string,
    updateSessionInputDto: UpdateSessionInputDto
  ): Promise<SessionDto | null> {
    return await this.updateEntity("id", id, updateSessionInputDto);
  }

  async deleteSession(id: string): Promise<SessionDto | null> {
    return await this.deleteEntity("id", id);
  }
}
