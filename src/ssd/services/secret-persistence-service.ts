import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import {
  PrismaClient as PrismaSsdClient,
  Secret as SecretDto,
  Prisma,
} from "@prisma-dual-cli/generated/ssd-client";

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
  ): Promise<SecretDto | null> {
    return await this.createEntity(createSecretInputDto);
  }

  async getSecretByUserId(userId: string): Promise<SecretDto | null> {
    return await this.getUniqueEntity("userId", userId);
  }

  async updateSecret(
    userId: string,
    updateSecretInputDto: UpdateSecretInputDto
  ): Promise<SecretDto | null> {
    return await this.updateEntity("userId", userId, updateSecretInputDto);
  }

  async deleteSecret(userId: string): Promise<SecretDto | null> {
    return await this.deleteEntity("userId", userId);
  }
}
