import { v4 as uuid } from 'uuid';
import { UserPersistenceService } from '../user-persistence-service';
import { DateTime } from 'luxon';
import { prismaMockClients } from '../../../shared/test-helpers/mock-prisma';


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

        const newUserDto = await userPersistenceService.createUser(createUserInputDto)
        
        expect(newUserDto).toEqual(mockUserDto)
    })
})
