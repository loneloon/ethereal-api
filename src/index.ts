import { AppPersistenceService } from "./aup/services/app-persistence-service";
import { UserPersistenceService } from "./aup/services/user-persistence-service";
import { UserProjectionPersistenceService } from "./aup/services/user-projection-persistence-service";
import { SessionPersistenceService } from "./ssd/services/session-persistence-service";
import { SecretPersistenceService } from "./ssd/services/secret-persistence-service";
import { DevicePersistenceService } from "./ssd/services/device-persistence-service";
import { UserManagementController } from "./controllers/user-management-controller";
import clients from "./prisma-clients";
import express from "express";
import cors from "cors";
import { registerUser, signInUser } from "./handlers";

const DEFAULT_PORT: number = 8000;

async function main(): Promise<void> {
  // THIS IS A TEMPORARY SETUP FOR TESTING CONTROLLERS ON THE FLY
  //
  // TODO:
  //    - STRING VALIDATORS FOR EMAIL, PASS, ETC. INSIDE CONTROLLER METHODS
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

  const app: express.Application = express();
  app.use(cors());
  app.use(express.urlencoded());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.send(`Ethereal API v${process.env.API_VERSION}`);
  });

  app.post("/user/register", (req, res) =>
    registerUser({ req, res }, userManagementController)
  );

  app.post("/user/sign-in", (req, res) =>
    signInUser({ req, res }, userManagementController)
  );

  app.listen(DEFAULT_PORT, () => {
    console.log(
      `[${process.env.SYSTEM_ID}:v${process.env.API_VERSION}]: Listening to requests on port ${DEFAULT_PORT}...`
    );
  });
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
