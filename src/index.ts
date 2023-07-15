import { AppPersistenceService } from "./aup/services/app-persistence-service";
import { UserPersistenceService } from "./aup/services/user-persistence-service";
import { UserProjectionPersistenceService } from "./aup/services/user-projection-persistence-service";
import { SessionPersistenceService } from "./ssd/services/session-persistence-service";
import { SecretPersistenceService } from "./ssd/services/secret-persistence-service";
import { DevicePersistenceService } from "./ssd/services/device-persistence-service";
import { UserManagementController } from "./controllers/user/user-management-controller";
import clients from "./prisma-clients";
import express from "express";
import cors from "cors";
import {
  getUser,
  signUpUser,
  signInUser,
  signOutUser,
  updateUserPassword,
  updateUserEmail,
  updateUserUsername,
  updateUserName,
  registerApp,
  resetAppKeys,
  getAllApps,
  updateAppName,
  updateAppEmail,
  updateAppUrl,
  getApp,
  getAppUsers,
  unfollowApp,
  followApp,
  getAppUser,
  proxySignInUser,
  getUserSessionStatus,
  getUserFollowedApps,
  getAppsForUser,
  getAppAccount,
  authenticateAppUser,
} from "./handlers";
import { SecretProcessingService } from "./ssd/services/secret-processing-service";
import { Espeon } from "espeon";
import { AppManagementController } from "./controllers/app/app-management-controller";

async function main(): Promise<void> {
  const config = (() => {
    const deploymentTheme = process.env.DEPLOYMENT_THEME;

    if (!deploymentTheme) {
      throw new Error(
        JSON.stringify({
          message: "Incorrect API config! Missing deployment theme!",
        })
      );
    }

    const port: number = process.env.PORT ? parseInt(process.env.PORT) : 8000;
    const apiVersion: string = process.env.API_VERSION ?? "X.X.X";
    const systemId: string = process.env.SYSTEM_ID ?? "Rogue";

    return {
      deploymentTheme,
      port,
      apiVersion,
      systemId,
    };
  })();

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

  const encryptionService = new Espeon(config.deploymentTheme);

  const secretProcessingService = new SecretProcessingService(
    encryptionService
  );

  const userManagementController = new UserManagementController(
    userPersistenceService,
    userProjectionPersistenceService,
    applicationPersistenceService,
    sessionPersistenceService,
    secretPersistenceService,
    devicePersistenceService,
    secretProcessingService
  );

  const appManagementController = new AppManagementController(
    applicationPersistenceService,
    userProjectionPersistenceService,
    secretPersistenceService,
    secretProcessingService
  );

  const app: express.Application = express();
  app.use(cors());
  app.use(express.urlencoded());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.send(`Ethereal API v${process.env.API_VERSION}`);
  });

  // ====================
  //    USER REQUESTS
  // ====================
  app.post("/user/sign-up", (req, res) =>
    signUpUser({ req, res }, userManagementController)
  );

  app.post("/user/sign-in", (req, res) =>
    signInUser({ req, res }, userManagementController)
  );

  app.get("/user/session", (req, res) =>
    getUserSessionStatus({ req, res }, userManagementController)
  );

  app.post("/user/sign-out", (req, res) =>
    signOutUser({ req, res }, userManagementController)
  );

  app.get("/user/account", (req, res) =>
    getUser({ req, res }, userManagementController)
  );

  app.post("/user/update/password", (req, res) =>
    updateUserPassword({ req, res }, userManagementController)
  );

  app.post("/user/update/email", (req, res) =>
    updateUserEmail({ req, res }, userManagementController)
  );

  app.post("/user/update/username", (req, res) =>
    updateUserUsername({ req, res }, userManagementController)
  );

  app.post("/user/update/name", (req, res) =>
    updateUserName({ req, res }, userManagementController)
  );

  app.post("/user/follow-app", (req, res) =>
    followApp({ req, res }, userManagementController)
  );

  app.post("/user/unfollow-app", (req, res) =>
    unfollowApp({ req, res }, userManagementController)
  );

  app.get("/user/app/profile", (req, res) =>
    getAppUser({ req, res }, userManagementController)
  );

  app.get("/user/apps", (req, res) =>
    getAppsForUser({ req, res }, userManagementController)
  );

  app.get("/user/apps/followed", (req, res) =>
    getUserFollowedApps({ req, res }, userManagementController)
  );

  app.get("/user/sign-in/app", (req, res) =>
    authenticateAppUser({ req, res }, userManagementController)
  );

  // ====================
  //     APP REQUESTS
  // ====================
  app.post("/app/register", (req, res) =>
    registerApp({ req, res }, appManagementController)
  );

  app.post("/app/reset-keys", (req, res) =>
    resetAppKeys({ req, res }, appManagementController)
  );

  app.post("/app/update/name", (req, res) =>
    updateAppName({ req, res }, appManagementController)
  );

  app.post("/app/update/email", (req, res) =>
    updateAppEmail({ req, res }, appManagementController)
  );

  app.post("/app/update/url", (req, res) =>
    updateAppUrl({ req, res }, appManagementController)
  );

  app.get("/app", (req, res) => getApp({ req, res }, appManagementController));

  app.get("/app/account", (req, res) =>
    getAppAccount({ req, res }, appManagementController)
  );

  app.get("/apps", (req, res) =>
    getAllApps({ req, res }, appManagementController)
  );

  app.get("/app/users", (req, res) =>
    getAppUsers({ req, res }, appManagementController)
  );

  app.post("/app/user/proxy/sign-in", (req, res) =>
    proxySignInUser(
      { req, res },
      userManagementController,
      appManagementController
    )
  );

  app.listen(config.port, () => {
    console.log(
      `[EtherealAPI:${config.systemId}:v${config.apiVersion}]: Listening to requests on port ${config.port}...`
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
