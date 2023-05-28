import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import {
  PrismaClient as PrismaSsdClient,
  Secret as SecretDto,
  Prisma,
} from "@prisma-dual-cli/generated/ssd-client";
import { Secret } from "../models/secret";
import { mapSecretDtoToDomain } from "../mappers/dto-to-domain";

// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateSecretInputDto {
  userId: string;
  passHash: string;
  salt: string;
}

export interface UpdateSecretInputDto {
  passHash?: string;
  salt?: string;
}

export class SecretPersistenceService extends PrismaBasedPersistenceService<
  PrismaSsdClient,
  Prisma.SecretDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >,
  SecretDto,
  CreateSecretInputDto,
  UpdateSecretInputDto
> {
  protected readonly entityTypeName: string = "Secret";
  protected readonly modelAccessor: Prisma.SecretDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  > & { create: any; findMany: any; findUnique: any; update: any; delete: any };
  protected readonly isPrimaryKeyComposite: boolean = false;

  constructor(readonly prismaClient: PrismaSsdClient) {
    super();
    this.modelAccessor = this.prismaClient.secret;
  }

  async createSecret(
    createSecretInputDto: CreateSecretInputDto
  ): Promise<Secret | null> {
    const createdSecretDto: SecretDto | null = await this.createEntity(
      createSecretInputDto
    );
    return createdSecretDto ? mapSecretDtoToDomain(createdSecretDto) : null;
  }

  async getSecretByUserId(userId: string): Promise<Secret | null> {
    const secretDto: SecretDto | null = await this.getUniqueEntity(
      "userId",
      userId
    );
    return secretDto ? mapSecretDtoToDomain(secretDto) : null;
  }

  async updateSecret(
    userId: string,
    updateSecretInputDto: UpdateSecretInputDto
  ): Promise<Secret | null> {
    const updatedSecretDto: SecretDto | null = await this.updateEntity(
      "userId",
      userId,
      updateSecretInputDto
    );
    return updatedSecretDto ? mapSecretDtoToDomain(updatedSecretDto) : null;
  }

  async deleteSecret(userId: string): Promise<Secret | null> {
    const deletedSecretDto: SecretDto | null = await this.deleteEntity(
      "userId",
      userId
    );
    return deletedSecretDto ? mapSecretDtoToDomain(deletedSecretDto) : null;
  }
}
