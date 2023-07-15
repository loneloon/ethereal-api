import { Application as ApplicationDto } from "@prisma-dual-cli/generated/aup-client";
import { AppPersistenceService } from "../../aup/services/app-persistence-service";
import { UserProjectionPersistenceService } from "../../aup/services/user-projection-persistence-service";
import { SecretPersistenceService } from "../../ssd/services/secret-persistence-service";
import { SecretProcessingService } from "../../ssd/services/secret-processing-service";
import _ from "lodash";
import { validateEmailString } from "../../shared/validators";
import { Application } from "../../aup/models/application";
import {
  AppDoesntExistAnymoreWithAccessKeysError,
  InvalidAppCredentialsError,
  AppCannotBeCreatedError,
  AppRollbackError,
  AppNameIsNotAvailableError,
  AppDoesntExistAnymoreError,
  AppDoesntExistError,
} from "../../shared/custom-errors";
import { ApplicationKeysDto } from "../../ssd/dtos/authentication";
import {
  mapApplicationDomainToPrivateApplicationViewDto,
  mapApplicationDomainToPublicApplicationViewDto,
  mapUserProjectionDomainToAppUserDto,
} from "../../aup/mappers/domain-to-dto";
import { PublicApplicationViewDto } from "../../aup/dtos/application";
import { UserProjection } from "../../aup/models/user-projection";
import { AppUserDto } from "../../aup/dtos/user-projection";
import { AppSecretController } from "./sub-controllers/app-secret-controller";
import { AppUpdateController } from "./sub-controllers/app-update-controller";

export class AppManagementController {
  private readonly appSecretController: AppSecretController;
  private readonly appUpdateController: AppUpdateController;

  constructor(
    readonly appPersistenceService: AppPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly secretPersistenceService: SecretPersistenceService,
    readonly secretProcessingService: SecretProcessingService
  ) {
    this.appSecretController = new AppSecretController(
      this.secretPersistenceService,
      this.secretProcessingService
    );
    this.appUpdateController = new AppUpdateController(
      this.appPersistenceService
    );
  }

  public async getApp(appName: string): Promise<PublicApplicationViewDto> {
    const app: Application = await this.resolveAppByName(appName);

    return mapApplicationDomainToPublicApplicationViewDto(app);
  }

  public async getAllPublicApps(): Promise<PublicApplicationViewDto[]> {
    const allApps: Application[] =
      await this.appPersistenceService.getAllApplications();
    const allActiveApps: Application[] = allApps.filter((app) => app.isActive);

    // TechDebt: We don't have this property on application model yet,
    // but in the future we might need to filter out the applications that choose to remain private/hidden

    return allActiveApps.map((app) =>
      mapApplicationDomainToPublicApplicationViewDto(app)
    );
  }

  public async getAppAccount(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<Omit<ApplicationDto, "id" | "isActive">> {
    const targetApp: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );

    return mapApplicationDomainToPrivateApplicationViewDto(targetApp);
  }

  private async checkAppNameAvailability(name: string): Promise<boolean> {
    const app: Application | null =
      await this.appPersistenceService.getApplicationByName(name);

    if (app && app.isActive) {
      return false;
    } else if (app && !app.isActive) {
      // TODO: There is a complicated edge-case where we need to account for
      // previously "deleted" applications, in our logic we deactivate them instead of deleting
      return false;
    }
    return true;
  }

  public async registerApp(
    name: string,
    email: string,
    url: string
  ): Promise<ApplicationKeysDto> {
    // INPUT VALIDATORS SECTION

    validateEmailString(email);

    const isAppNameAvailable: boolean = await this.checkAppNameAvailability(
      name
    );

    if (!isAppNameAvailable) {
      throw new AppNameIsNotAvailableError(name);
    }

    const newApp: Application | null =
      await this.appPersistenceService.createApplication({
        name,
        email,
        url,
      });

    if (!newApp) {
      throw new AppCannotBeCreatedError(name, email, url);
    }

    try {
      const [newAppSecret, backupCode] =
        await this.appSecretController.createAppSecret(
          newApp.id,
          newApp.metadata.creationTimestamp
        );

      return {
        accessKeyId: this.secretProcessingService.encryptionService.encrypt(
          newAppSecret.externalId
        ),
        secretAccessKey: this.secretProcessingService.encryptionService.encrypt(
          newAppSecret.passHash
        ),
        backupCode,
      };
    } catch (error: any) {
      console.warn("Performing app rollback! Aborting app creation!");
      const deletedApp = await this.appPersistenceService.deleteApplication(
        newApp.id
      );

      if (!deletedApp) {
        throw new AppRollbackError(name, email, url);
      }

      throw new AppCannotBeCreatedError(name, email, url);
    }
  }

  public async resetAccessKeys(
    appName: string,
    email: string,
    backupCode: string
  ): Promise<ApplicationKeysDto> {
    const app: Application = await this.resolveAppByName(appName);

    if (app.email !== email) {
      throw new InvalidAppCredentialsError();
    }

    return await this.appSecretController.resetAccessKeys(
      app.id,
      app.metadata.creationTimestamp,
      backupCode
    );
  }

  public async updateAppName(
    accessKeyId: string,
    secretAccessKey: string,
    name: string
  ): Promise<void> {
    const targetApp: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );

    const isAppNameAvailable: boolean = await this.checkAppNameAvailability(
      name
    );

    if (!isAppNameAvailable) {
      throw new AppNameIsNotAvailableError(name);
    }

    await this.appUpdateController.updateAppName(targetApp.id, name);
  }

  public async updateAppUrl(
    accessKeyId: string,
    secretAccessKey: string,
    url: string
  ): Promise<void> {
    const targetApp: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );

    await this.appUpdateController.updateAppUrl(targetApp.id, url);
  }

  public async updateAppEmail(
    accessKeyId: string,
    secretAccessKey: string,
    email: string
  ): Promise<void> {
    const targetApp: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );
    await this.appUpdateController.updateAppEmail(targetApp.id, email);
  }

  public async deactivateApp(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<void> {
    const targetApp: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );

    await this.appUpdateController.deactivateApp(targetApp.id);

    await this.appSecretController.deleteAppSecret(targetApp.id);
  }

  private async resolveAppById(appId: string): Promise<Application> {
    const app: Application | null =
      await this.appPersistenceService.getApplicationById(appId);

    if (!app) {
      // This can happen if an application record was hard deleted but related secret wasn't deleted before/after that
      // We can communicate that application doesn't exist anymore, but this is considered a critical error and requires manual action
      console.warn(
        JSON.stringify({
          message:
            "[CRITICAL] Orphan secret detected! There is a leftover secret record that is linked to an app that doesn't exist anymore. Cannot resolve application!",
          appId,
        })
      );
      throw new AppDoesntExistAnymoreWithAccessKeysError(appId);
    }

    if (!app.isActive) {
      // This can happen if an application record was deactivated but related secret wasn't deleted before/after that
      // We can communicate that application doesn't exist anymore, but this is considered a critical error and requires manual action
      console.warn(
        JSON.stringify({
          message:
            "[CRITICAL] Orphan secret detected! There is a leftover secret record that is linked to a deactivated app. Cannot resolve application!",
          appId: appId,
        })
      );
      throw new AppDoesntExistAnymoreWithAccessKeysError(appId);
    }

    return app;
  }

  private async resolveAppByName(appName: string): Promise<Application> {
    const app: Application | null =
      await this.appPersistenceService.getApplicationByName(appName);

    if (!app) {
      throw new AppDoesntExistError(appName);
    }

    if (!app.isActive) {
      throw new AppDoesntExistAnymoreError(app.id);
    }

    return app;
  }

  public async resolveAppByAccessKey(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<Application> {
    const targetAppId: string =
      await this.appSecretController.resolveAppIdByAccessKey(
        accessKeyId,
        secretAccessKey
      );

    return await this.resolveAppById(targetAppId);
  }

  // ======================================
  //            APP USER METHODS
  // ======================================

  public async getAppUsers(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<AppUserDto[]> {
    const targetAppId: string =
      await this.appSecretController.resolveAppIdByAccessKey(
        accessKeyId,
        secretAccessKey
      );

    const allAppUsers: UserProjection[] =
      await this.userProjectionPersistenceService.getProjectionsByAppId(
        targetAppId
      );
    const activeAppUsers: UserProjection[] = allAppUsers.filter(
      (appUser) => appUser.isActive
    );

    return activeAppUsers.map((userProjection) =>
      mapUserProjectionDomainToAppUserDto(userProjection)
    );
  }
}
