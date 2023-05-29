import clients from "./prisma-clients";
import { AppPersistenceService } from "./aup/services/app-persistence-service";
import { UserPersistenceService } from "./aup/services/user-persistence-service";
import { UserProjectionPersistenceService } from "./aup/services/user-projection-persistence-service";
import { SessionPersistenceService } from "./ssd/services/session-persistence-service";
import { SecretPersistenceService } from "./ssd/services/secret-persistence-service";
import { DevicePersistenceService } from "./ssd/services/device-persistence-service";
import { UserManagementController } from "./controllers/user-management-controller";

async function main(): Promise<void> {
  // THIS IS A TEMPORARY SETUP FOR TESTING CONTROLLERS ON THE FLY
  //
  // TODO:
  //    - UNIT TESTS FOR SERVICES AND CONTROLLERS
  //    - DOMAIN TO DTO MAPPERS FOR AUP AND SSD
  //    - APP USER FLOW FOR USER MANAGEMENT CONTROLLER
  //    - APP MANAGEMENT CONTROLLER
  //    - ROLES AND PERMISSIONS
  //    - CONSIDER USING DECORATORS TO RESOLVE SESSION AND USER STATE ON OPERATION BASIS (ALSO APPLICABLE FOR PERMISSION CHECKS)
  const applicationPersistenceService = new AppPersistenceService(
    clients.aupClient
  );
  const userPersistenceService = new UserPersistenceService(clients.aupClient);
  const userProjectionPersistenceService = new UserProjectionPersistenceService(
    clients.aupClient
  );

  const sessionPersistenceService = new SessionPersistenceService(
    clients.ssdClient
  );
  const secretPersistenceService = new SecretPersistenceService(
    clients.ssdClient
  );
  const devicePersistenceService = new DevicePersistenceService(
    clients.ssdClient
  );

  const userManagementController = new UserManagementController(
    userPersistenceService,
    userProjectionPersistenceService,
    applicationPersistenceService,
    sessionPersistenceService,
    secretPersistenceService,
    devicePersistenceService
  );
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
