import { PrismaBasedPersistenceService } from "@shared/persistence-service";
import {
  PrismaClient as PrismaAupClient,
  UserProjection as UserProjectionDto,
  Prisma,
} from "@prisma-dual-cli/generated/aup-client";
import { UserProjection } from "../models/user-projection";
import { mapUserProjectionDtoToDomain } from "../mappers/dto-to-domain";

// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateUserProjectionArgsDto {
  userId: string;
  appId: string;
  alias?: string;
}

export interface UpdateUserProjectionArgsDto {
  isActive?: boolean;
  alias?: string;
}

export class UserProjectionPersistenceService extends PrismaBasedPersistenceService<
  PrismaAupClient,
  Prisma.UserProjectionDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >,
  UserProjectionDto,
  CreateUserProjectionArgsDto,
  UpdateUserProjectionArgsDto
> {
  protected readonly entityTypeName: string = "UserProjection";
  protected readonly modelAccessor: Prisma.UserProjectionDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
  protected readonly isPrimaryKeyComposite: boolean = false;

  constructor(readonly prismaClient: PrismaAupClient) {
    super();
    this.modelAccessor = this.prismaClient.userProjection;
  }

  async createUserProjection(
    createUserProjectionArgsDto: CreateUserProjectionArgsDto
  ): Promise<UserProjection | null> {
    const newUserProjectionDto: UserProjectionDto | null =
      await this.createEntity(createUserProjectionArgsDto);

    return newUserProjectionDto
      ? mapUserProjectionDtoToDomain(newUserProjectionDto)
      : null;
  }

  async getAllProjections(): Promise<UserProjection[]> {
    const allUserProjectionDtos: UserProjectionDto[] =
      await this.getAllEntities();

    return allUserProjectionDtos.map((projectionDto) =>
      mapUserProjectionDtoToDomain(projectionDto)
    );
  }

  async getProjectionsByUserId(userId: string): Promise<UserProjection[]> {
    const userProjectionDtos: UserProjectionDto[] = await this.searchEntities({
      userId,
    });

    return userProjectionDtos.map((projectionDto) =>
      mapUserProjectionDtoToDomain(projectionDto)
    );
  }

  async getProjectionsByAppId(appId: string): Promise<UserProjection[]> {
    const userProjectionDtos: UserProjectionDto[] = await this.searchEntities({
      appId,
    });

    return userProjectionDtos.map((projectionDto) =>
      mapUserProjectionDtoToDomain(projectionDto)
    );
  }

  async getProjectionByAppAndUserId(
    appId: string,
    userId: string
  ): Promise<UserProjection | null> {
    const userProjectionDto: UserProjectionDto | null =
      await this.getUniqueEntity("appId_userId", { appId, userId });
    return userProjectionDto
      ? mapUserProjectionDtoToDomain(userProjectionDto)
      : null;
  }

  async getProjectionById(id: string): Promise<UserProjection | null> {
    const userProjectionDto: UserProjectionDto | null =
      await this.getUniqueEntity("id", id);
    return userProjectionDto
      ? mapUserProjectionDtoToDomain(userProjectionDto)
      : null;
  }

  async updateUserProjection(
    appId: string,
    userId: string,
    updateUserProjectionArgsDto: UpdateUserProjectionArgsDto
  ): Promise<UserProjection | null> {
    const updatedUserProjectionDto: UserProjectionDto | null =
      await this.updateEntity(
        "appId_userId",
        { appId, userId },
        updateUserProjectionArgsDto
      );

    return updatedUserProjectionDto
      ? mapUserProjectionDtoToDomain(updatedUserProjectionDto)
      : null;
  }

  /**
   * @deprecated Instead of hard deleting user projections, deactivate them by setting 'isActive' flag to false
   */
  async deleteUserProjection(
    appId: string,
    userId: string
  ): Promise<UserProjection | null> {
    const deletedUserProjectionDto: UserProjectionDto | null =
      await this.deleteEntity("appId_userId", { appId, userId });

    return deletedUserProjectionDto
      ? mapUserProjectionDtoToDomain(deletedUserProjectionDto)
      : null;
  }
}
