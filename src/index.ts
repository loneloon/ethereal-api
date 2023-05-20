import clients from "./prisma-clients";

async function main(): Promise<void> {   
}


main()
  .then(async () => {
    await clients.aupClient.$disconnect()
    await clients.ssdClient.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await clients.aupClient.$disconnect()
    await clients.ssdClient.$disconnect()
    process.exit(1)
  })
