import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import {
  PrismaClient as PrismaSsdClient,
  Session as SessionDto,
  Prisma,
} from "@prisma-dual-cli/generated/ssd-client";
import { Session } from "../models/session";
import { mapSessionDtoToDomain } from "../mappers/dto-to-domain";

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
  ): Promise<Session | null> {
    const createdSessionDto: SessionDto | null = await this.createEntity(
      createSessionInputDto
    );
    return createdSessionDto ? mapSessionDtoToDomain(createdSessionDto) : null;
  }

  async getSessionById(id: string): Promise<Session | null> {
    const sessionDto: SessionDto | null = await this.getUniqueEntity("id", id);
    return sessionDto ? mapSessionDtoToDomain(sessionDto) : null;
  }

  async getSessionsByUserId(userId: string): Promise<Session[]> {
    const sessionDtos: SessionDto[] = await this.searchEntities({ userId });
    return sessionDtos.map((sessionDto) => mapSessionDtoToDomain(sessionDto));
  }

  async getSessionsByDeviceId(deviceId: string): Promise<Session[]> {
    const sessionDtos: SessionDto[] = await this.searchEntities({ deviceId });
    return sessionDtos.map((sessionDto) => mapSessionDtoToDomain(sessionDto));
  }

  async getAllSessions(): Promise<Session[]> {
    const sessionDtos: SessionDto[] = await this.getAllEntities();
    return sessionDtos.map((sessionDto) => mapSessionDtoToDomain(sessionDto));
  }

  async updateSession(
    id: string,
    updateSessionInputDto: UpdateSessionInputDto
  ): Promise<Session | null> {
    const updatedSessionDto: SessionDto | null = await this.updateEntity(
      "id",
      id,
      updateSessionInputDto
    );
    return updatedSessionDto ? mapSessionDtoToDomain(updatedSessionDto) : null;
  }

  async deleteSession(id: string): Promise<Session | null> {
    const deletedSessionDto: SessionDto | null = await this.deleteEntity(
      "id",
      id
    );
    return deletedSessionDto ? mapSessionDtoToDomain(deletedSessionDto) : null;
  }
}
