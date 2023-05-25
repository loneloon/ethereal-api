import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import {
  PrismaClient as PrismaSsdClient,
  Device as DeviceDto,
  Prisma,
} from "@prisma-dual-cli/generated/ssd-client";

// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateDeviceInputDto {
  expiresAt: Date;
  deviceId: string;
  userId: string;
}

// Some UpdateInput interfaces may be left unfilled
// in cases where persistence updates are not currently needed,
// but changes are possible in the future.

export interface UpdateDeviceInputDto {}

export class DevicePersistenceService extends PrismaBasedPersistenceService<
  PrismaSsdClient,
  Prisma.DeviceDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >,
  DeviceDto,
  CreateDeviceInputDto,
  UpdateDeviceInputDto
> {
  protected readonly entityTypeName: string = "Device";
  protected readonly modelAccessor: Prisma.DeviceDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  > & { create: any; findMany: any; findUnique: any; update: any; delete: any };
  protected readonly isPrimaryKeyComposite: boolean = false;

  constructor(readonly prismaClient: PrismaSsdClient) {
    super();
    this.modelAccessor = this.prismaClient.device;
  }

  async createDevice(
    createDeviceInputDto: CreateDeviceInputDto
  ): Promise<DeviceDto | null> {
    return await this.createEntity(createDeviceInputDto);
  }

  async getDeviceById(id: string): Promise<DeviceDto | null> {
    return await this.getUniqueEntity("id", id);
  }

  async getAllDevices(): Promise<DeviceDto[]> {
    return await this.getAllEntities();
  }

  async updateDevice(
    id: string,
    updateDeviceInputDto: UpdateDeviceInputDto
  ): Promise<DeviceDto | null> {
    return await this.updateEntity("id", id, updateDeviceInputDto);
  }

  async deleteDevice(id: string): Promise<DeviceDto | null> {
    return await this.deleteEntity("id", id);
  }
}
