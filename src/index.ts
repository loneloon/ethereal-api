import { DateTime } from "luxon";
import clients from "./prisma-clients";
import { SecretProcessingService } from "./ssd/services/secret-processing-service";

async function main(): Promise<void> {
  const testPass = "96986wordLul";

  const [hash, salt] =
    await SecretProcessingService.generatePasswordHashAndSalt(testPass);

  console.log(hash, salt);
}

main()
  .then(async () => {
    await clients.aupClient.$disconnect();
    await clients.ssdClient.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await clients.aupClient.$disconnect();
    await clients.ssdClient.$disconnect();
    process.exit(1);
  });
