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

export interface CreateDeviceArgsDto {
  userAgent: string;
  ip: string;
}

// Some UpdateInput interfaces may be left unfilled
// in cases where persistence updates are not currently needed,
// but changes are possible in the future.

export interface UpdateDeviceArgsDto {}

export class DevicePersistenceService extends PrismaBasedPersistenceService<
  PrismaSsdClient,
  Prisma.DeviceDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >,
  DeviceDto,
  CreateDeviceArgsDto,
  UpdateDeviceArgsDto
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
    createDeviceArgsDto: CreateDeviceArgsDto
  ): Promise<Device | null> {
    const createdDeviceDto: DeviceDto | null = await this.createEntity(
      createDeviceArgsDto
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

  async getDeviceByUserAgentAndIp(
    userAgent: string,
    ip: string
  ): Promise<Device | null> {
    const deviceDto = await this.getUniqueEntity("userAgent_ip", {
      userAgent,
      ip,
    });

    return deviceDto ? mapDeviceDtoToDomain(deviceDto) : null;
  }

  async updateDevice(
    id: string,
    updateDeviceArgsDto: UpdateDeviceArgsDto
  ): Promise<Device | null> {
    const updatedDeviceDto: DeviceDto | null = await this.updateEntity(
      "id",
      id,
      updateDeviceArgsDto
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
