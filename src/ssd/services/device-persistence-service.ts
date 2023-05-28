import { PrismaBasedPersistenceService } from "../../shared/persistence-service";
import {
  PrismaClient as PrismaSsdClient,
  Device as DeviceDto,
  Prisma,
} from "@prisma-dual-cli/generated/ssd-client";
import { Device } from "../models/device";
import {
  mapDeviceDtoToDomain,
  mapSessionDtoToDomain,
} from "../mappers/dto-to-domain";

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
  ): Promise<Device | null> {
    const createdDeviceDto: DeviceDto | null = await this.createEntity(
      createDeviceInputDto
    );
    return createdDeviceDto ? mapDeviceDtoToDomain(createdDeviceDto) : null;
  }

  async getDeviceById(id: string): Promise<Device | null> {
    const deviceDto: DeviceDto | null = await this.getUniqueEntity("id", id);
    return deviceDto ? mapDeviceDtoToDomain(deviceDto) : null;
  }

  async getAllDevices(): Promise<Device[]> {
    const deviceDtos: DeviceDto[] = await this.getAllEntities();
    return deviceDtos.map((deviceDto) => mapDeviceDtoToDomain(deviceDto));
  }

  async updateDevice(
    id: string,
    updateDeviceInputDto: UpdateDeviceInputDto
  ): Promise<Device | null> {
    const updatedDeviceDto: DeviceDto | null = await this.updateEntity(
      "id",
      id,
      updateDeviceInputDto
    );
    return updatedDeviceDto ? mapDeviceDtoToDomain(updatedDeviceDto) : null;
  }

  async deleteDevice(id: string): Promise<Device | null> {
    const deletedDeviceDto: DeviceDto | null = await this.deleteEntity(
      "id",
      id
    );
    return deletedDeviceDto ? mapDeviceDtoToDomain(deletedDeviceDto) : null;
  }
}
