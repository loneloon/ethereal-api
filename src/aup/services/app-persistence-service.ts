import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import {
  PrismaClient as PrismaAupClient,
  Application as ApplicationDto,
  Prisma,
} from "@prisma-dual-cli/generated/aup-client";

// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateApplicationInputDto {
  name: string;
  url: string;
}

export interface UpdateApplicationInputDto {
  name: string;
  url: string;
  isActive: boolean;
}

export class AppPersistenceService extends PrismaBasedPersistenceService<
  PrismaAupClient,
  Prisma.ApplicationDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >,
  ApplicationDto,
  CreateApplicationInputDto,
  UpdateApplicationInputDto
> {
  protected readonly entityTypeName: string = "Application";
  protected readonly modelAccessor: Prisma.ApplicationDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
  protected readonly isPrimaryKeyComposite: boolean = false;

  constructor(readonly prismaClient: PrismaAupClient) {
    super();
    this.modelAccessor = this.prismaClient.application;
  }

  async createApplication(
    createApplicationInputDto: CreateApplicationInputDto
  ): Promise<ApplicationDto | null> {
    return await this.createEntity(createApplicationInputDto);
  }

  async getApplicationById(id: string): Promise<ApplicationDto | null> {
    return await this.getUniqueEntity("id", id);
  }

  async getAllApplications(): Promise<ApplicationDto[]> {
    return await this.getAllEntities();
  }

  async updateApplication(
    id: string,
    updateApplicationInputDto: UpdateApplicationInputDto
  ): Promise<ApplicationDto | null> {
    return await this.updateEntity("id", id, updateApplicationInputDto);
  }

  /**
   * @deprecated Instead of hard deleting application records, deactivate them by setting 'isActive' flag to false
   */
  async deleteApplication(id: string): Promise<ApplicationDto | null> {
    return await this.deleteEntity("id", id);
  }
}
