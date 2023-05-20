import { v4 as uuid } from 'uuid';
import { UserPersistenceService } from '../user-persistence-service';
import { User } from '../../models/user';
import { Metadata, SourceMetadata } from '../../models/common';
import { DateTime } from 'luxon';
import { prismaMockClients } from '../../test-helpers/mock-prisma';


describe('UserPersistenceService should be able to ', () => {
    test("CREATE a USER record", async () => {
        const userPersistenceService = new UserPersistenceService(prismaMockClients.aupClient)

        const mockUserDto = {
            id: uuid(),
            email: "liz69@ethereal.com",
            username: "lizlizzard69",
            emailIsVerified: false,
            isActive: true,
            createdAt: DateTime.now().toJSDate(),
            updatedAt: DateTime.now().toJSDate(),
            firstName: "Lizzie",
            lastName: "Lizzardson"
        }

        const createUserInputDto = {
            email: "liz69@ethereal.com",
            username: "lizlizzard69",
        }

        prismaMockClients.aupClient.user.create.mockResolvedValue(
            mockUserDto
            )

        const newUser = await userPersistenceService.createUser(createUserInputDto)
        
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
        )

        expect(newUser).toEqual(expectedUser)
    })
})
