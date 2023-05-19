import { PrismaClient } from "@prisma/client";
import { UserPersistenceService } from "./services/user-persistence-service";

const prisma = new PrismaClient()

async function main(): Promise<void> {
    const userPersistenceService = new UserPersistenceService(prisma)

    console.log("Testing createUser method:")
    const newUser = await userPersistenceService.createUser({
        email: "liz69@ethereal.com",
        username: "lizlizzard69"
    })


    console.log(newUser)

    const lizsId = newUser?.id

    console.log("Testing getAllUsers method:")
    const allUsers = await userPersistenceService.getAllUsers()
    console.log(allUsers)

    if (lizsId) {
        console.log("Testing getUserById method:")
        const liz = await userPersistenceService.getUserById(lizsId)
        console.log(liz)

        console.log("Testing updateUser method:")
        const newLiz = await userPersistenceService.updateUser(lizsId, { email: "huggingbear@gmail.com" })
        console.log(newLiz)

        console.log("Testing deleteUser method:")
        const lizIsGone = await userPersistenceService.deleteUser(lizsId)

        console.log("Press f for liz")
        console.log(lizIsGone)
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
