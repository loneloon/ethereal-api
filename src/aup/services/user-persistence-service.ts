import { PrismaBasedPersistenceService } from "@shared/persistence-service";
import {
  PrismaClient as PrismaAupClient,
  User as UserDto,
  Prisma,
} from "@prisma-dual-cli/generated/aup-client";
import { mapUserDtoToDomain } from "../mappers/dto-to-domain";
import { User } from "../models/user";

// BE CAREFUL WITH FIELD NAMES IN THESE INTERFACES,
// THEY MUST MATCH THE SCHEMA EXACTLY!

export interface CreateUserArgsDto {
  email: string;
}

export interface UpdateUserArgsDto {
  email?: string;
  emailIsVerified?: boolean;
  isActive?: boolean;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export class UserPersistenceService extends PrismaBasedPersistenceService<
  PrismaAupClient,
  Prisma.UserDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >,
  UserDto,
  CreateUserArgsDto,
  UpdateUserArgsDto
> {
  protected readonly entityTypeName: string = "User";
  protected readonly modelAccessor: Prisma.UserDelegate<
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
  protected readonly isPrimaryKeyComposite: boolean = false;

  constructor(readonly prismaClient: PrismaAupClient) {
    super();
    this.modelAccessor = this.prismaClient.user;
  }

  async createUser(createUserArgsDto: CreateUserArgsDto): Promise<User | null> {
    const newUserDto: UserDto | null = await this.createEntity(
      createUserArgsDto
    );

    return newUserDto ? mapUserDtoToDomain(newUserDto) : null;
  }

  async getAllUsers(): Promise<User[]> {
    const userDtos: UserDto[] = await this.getAllEntities();

    return userDtos.map((userDto) => mapUserDtoToDomain(userDto));
  }

  async getUserById(id: string): Promise<User | null> {
    const userDto: UserDto | null = await this.getUniqueEntity("id", id);

    return userDto ? mapUserDtoToDomain(userDto) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const userDto: UserDto | null = await this.getUniqueEntity("email", email);

    return userDto ? mapUserDtoToDomain(userDto) : null;
  }

  async updateUser(
    id: string,
    updateUserArgsDto: UpdateUserArgsDto
  ): Promise<User | null> {
    const updatedUserDto: UserDto | null = await this.updateEntity(
      "id",
      id,
      updateUserArgsDto
    );

    return updatedUserDto ? mapUserDtoToDomain(updatedUserDto) : null;
  }

  /**
   * @deprecated Instead of hard deleting user records, deactivate them by setting 'isActive' flag to false
   */
  async deleteUser(id: string): Promise<User | null> {
    const deletedUserDto: UserDto | null = await this.deleteEntity("id", id);

    return deletedUserDto ? mapUserDtoToDomain(deletedUserDto) : null;
  }
}
