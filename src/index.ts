import { PrismaClient } from "@prisma/client";
import { UserPersistenceService } from "./services/user-persistence-service";

const prisma = new PrismaClient()

async function main(): Promise<void> {
    const userPersistenceService = new UserPersistenceService(prisma)

    const newUser = await userPersistenceService.createUser({
        email: "liz69@ethereal.com",
        username: "lizlizzard69"
    })


    console.log(newUser)

    const lizsId = newUser?.id

    const allUsers = await userPersistenceService.getAllUsers()
    console.log(allUsers)

    if (lizsId) {
        const liz = await userPersistenceService.getUserById(lizsId)
        console.log(liz)
    }
}


main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
