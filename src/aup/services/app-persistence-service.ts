import { PrismaBasedPersistenceService } from "@shared/persistence-service";
import {
  PrismaClient as PrismaAupClient,
  Application as ApplicationDto,
  Prisma,
} from "@prisma-dual-cli/generated/aup-client";
import { Application } from "../models/application";
import { mapApplicationDtoToDomain } from "../mappers/dto-to-domain";

// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateApplicationInputDto {
  name: string;
  url: string;
}

export interface UpdateApplicationInputDto {
  name?: string;
  url?: string;
  isActive?: boolean;
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
  ): Promise<Application | null> {
    const newAppDto: ApplicationDto | null = await this.createEntity(
      createApplicationInputDto
    );

    return newAppDto ? mapApplicationDtoToDomain(newAppDto) : null;
  }

  async getApplicationById(id: string): Promise<Application | null> {
    const appDto: ApplicationDto | null = await this.getUniqueEntity("id", id);

    return appDto ? mapApplicationDtoToDomain(appDto) : null;
  }

  async getAllApplications(): Promise<Application[]> {
    const appDtos: ApplicationDto[] = await this.getAllEntities();

    return appDtos.map((appDto) => mapApplicationDtoToDomain(appDto));
  }

  async updateApplication(
    id: string,
    updateApplicationInputDto: UpdateApplicationInputDto
  ): Promise<Application | null> {
    const updatedAppDto: ApplicationDto | null = await this.updateEntity(
      "id",
      id,
      updateApplicationInputDto
    );

    return updatedAppDto ? mapApplicationDtoToDomain(updatedAppDto) : null;
  }

  /**
   * @deprecated Instead of hard deleting application records, deactivate them by setting 'isActive' flag to false
   */
  async deleteApplication(id: string): Promise<Application | null> {
    const deletedAppDto: ApplicationDto | null = await this.deleteEntity(
      "id",
      id
    );

    return deletedAppDto ? mapApplicationDtoToDomain(deletedAppDto) : null;
  }
}
