import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import {
  PrismaClient as PrismaSsdClient,
  Secret as SecretDto,
  Prisma,
} from "@prisma-dual-cli/generated/ssd-client";
import { Secret, SecretType } from "../models/secret";
import { mapSecretDtoToDomain } from "../mappers/dto-to-domain";

// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateSecretArgsDto {
  externalId: string;
  type: SecretType;
  passHash: string;
  salt: string;
}

export interface UpdateSecretArgsDto {
  passHash?: string;
  salt?: string;
}

export class SecretPersistenceService extends PrismaBasedPersistenceService<
  PrismaSsdClient,
  Prisma.SecretDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >,
  SecretDto,
  CreateSecretArgsDto,
  UpdateSecretArgsDto
> {
  protected readonly entityTypeName: string = "Secret";
  protected readonly modelAccessor: Prisma.SecretDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  > & { create: any; findMany: any; findUnique: any; update: any; delete: any };
  protected readonly isPrimaryKeyComposite: boolean = true;

  constructor(readonly prismaClient: PrismaSsdClient) {
    super();
    this.modelAccessor = this.prismaClient.secret;
  }

  async createSecret(
    createSecretArgsDto: CreateSecretArgsDto
  ): Promise<Secret | null> {
    const createdSecretDto: SecretDto | null = await this.createEntity(
      createSecretArgsDto
    );
    return createdSecretDto ? mapSecretDtoToDomain(createdSecretDto) : null;
  }

  async getSecret(
    externalId: string,
    type: SecretType
  ): Promise<Secret | null> {
    const secretDto: SecretDto | null = await this.getUniqueEntity(
      "externalId_type",
      { externalId, type }
    );
    return secretDto ? mapSecretDtoToDomain(secretDto) : null;
  }

  async updateSecret(
    externalId: string,
    type: SecretType,
    updateSecretArgsDto: UpdateSecretArgsDto
  ): Promise<Secret | null> {
    const updatedSecretDto: SecretDto | null = await this.updateEntity(
      "externalId_type",
      { externalId, type },
      updateSecretArgsDto
    );
    return updatedSecretDto ? mapSecretDtoToDomain(updatedSecretDto) : null;
  }

  async deleteSecret(
    externalId: string,
    type: SecretType
  ): Promise<Secret | null> {
    const deletedSecretDto: SecretDto | null = await this.deleteEntity(
      "externalId_type",
      { externalId, type }
    );
    return deletedSecretDto ? mapSecretDtoToDomain(deletedSecretDto) : null;
  }
}
