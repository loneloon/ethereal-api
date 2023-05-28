import { v4 as uuid } from "uuid";
import {
  CreateUserArgsDto,
  UserPersistenceService,
} from "../user-persistence-service";
import { DateTime } from "luxon";
import { prismaMockClients } from "@shared/test-helpers/mock-prisma";
import { User } from "../../models/user";
import { Metadata, SourceMetadata } from "@shared/models/common";

describe("UserPersistenceService should be able to ", () => {
  test("CREATE a USER record", async () => {
    const userPersistenceService = new UserPersistenceService(
      prismaMockClients.aupClient
    );

    const mockUserDto = {
      id: uuid(),
      email: "liz69@ethereal.com",
      username: null,
      emailIsVerified: false,
      isActive: true,
      createdAt: DateTime.now().toJSDate(),
      updatedAt: DateTime.now().toJSDate(),
      firstName: null,
      lastName: null,
    };

    const createUserArgsDto: CreateUserArgsDto = {
      email: "liz69@ethereal.com",
    };

    const expectedUser = new User(
      mockUserDto.id,
      mockUserDto.email,
      mockUserDto.emailIsVerified,
      mockUserDto.username,
      mockUserDto.isActive,
      mockUserDto.firstName,
      mockUserDto.lastName,
      new Metadata(
        DateTime.fromJSDate(mockUserDto.createdAt),
        DateTime.fromJSDate(mockUserDto.updatedAt),
        new SourceMetadata()
      )
    );

    prismaMockClients.aupClient.user.create.mockResolvedValue(mockUserDto);

    const newUser = await userPersistenceService.createUser(createUserArgsDto);

    expect(newUser).toEqual(expectedUser);
  });
});
