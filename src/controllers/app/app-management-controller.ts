import { Application as ApplicationDto } from "@prisma-dual-cli/generated/aup-client";
import { AppPersistenceService } from "../../aup/services/app-persistence-service";
import { UserProjectionPersistenceService } from "../../aup/services/user-projection-persistence-service";
import { SecretPersistenceService } from "../../ssd/services/secret-persistence-service";
import { SecretProcessingService } from "../../ssd/services/secret-processing-service";
import { Secret } from "../../ssd/models/secret";
import { DateTime } from "luxon";

import _ from "lodash";
import { validateEmailString } from "../../shared/validators";
import { Application } from "../../aup/models/application";
import {
  AppDoesntExistAnymoreWithAccessKeysError,
  AppHasNoAssociatedSecretError,
  InvalidAppAccessKeyError,
  InvalidAppCredentialsError,
  AppCannotBeCreatedError,
  AppRollbackError,
  AppSecretCannotBeCreatedError,
  AppNameCannotBeUpdatedError,
  AppSecretCannotBeUpdatedError,
  AppNameIsNotAvailableError,
  AppSecretCannotBeDeletedError,
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
import { AppSecretController } from "./app-secret-controller";

export class AppManagementController {
  private readonly appSecretController: AppSecretController;

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
  }

  // ======================================
  //          GENERAL APP METHODS
  // ======================================

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

  public async updateAppName(
    accessKeyId: string,
    secretAccessKey: string,
    name: string
  ): Promise<void> {
    const targetAppId: string =
      await this.appSecretController.resolveAppIdByAccessKey(
        accessKeyId,
        secretAccessKey
      );

    const targetApp: Application = await this.resolveAppById(targetAppId);

    const isAppNameAvailable: boolean = await this.checkAppNameAvailability(
      name
    );

    if (!isAppNameAvailable) {
      throw new AppNameIsNotAvailableError(name);
    }

    const updatedApp: Application | null =
      await this.appPersistenceService.updateApplication(targetApp.id, {
        name,
      });

    if (!updatedApp) {
      throw new AppNameCannotBeUpdatedError(targetApp.id);
    }
  }

  public async updateAppUrl(
    accessKeyId: string,
    secretAccessKey: string,
    url: string
  ): Promise<void> {
    const targetAppId: string =
      await this.appSecretController.resolveAppIdByAccessKey(
        accessKeyId,
        secretAccessKey
      );

    const targetApp: Application = await this.resolveAppById(targetAppId);

    // TODO: Url string validator

    const updatedApp: Application | null =
      await this.appPersistenceService.updateApplication(targetApp.id, {
        url,
      });

    if (!updatedApp) {
      throw new AppNameCannotBeUpdatedError(targetApp.id);
    }
  }

  public async updateAppEmail(
    accessKeyId: string,
    secretAccessKey: string,
    email: string
  ): Promise<void> {
    const targetAppId: string =
      await this.appSecretController.resolveAppIdByAccessKey(
        accessKeyId,
        secretAccessKey
      );

    const targetApp: Application = await this.resolveAppById(targetAppId);

    validateEmailString(email);

    const updatedApp: Application | null =
      await this.appPersistenceService.updateApplication(targetApp.id, {
        email,
      });

    if (!updatedApp) {
      throw new AppNameCannotBeUpdatedError(targetApp.id);
    }
  }

  public async getApp(appName: string): Promise<PublicApplicationViewDto> {
    const app: Application = await this.resolveAppByName(appName);

    return mapApplicationDomainToPublicApplicationViewDto(app);
  }

  public async getAppAccount(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<Omit<ApplicationDto, "id" | "isActive">> {
    const targetAppId: string =
      await this.appSecretController.resolveAppIdByAccessKey(
        accessKeyId,
        secretAccessKey
      );

    const targetApp: Application = await this.resolveAppById(targetAppId);

    return mapApplicationDomainToPrivateApplicationViewDto(targetApp);
  }

  public async deactivateApp(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<void> {
    const targetAppId: string =
      await this.appSecretController.resolveAppIdByAccessKey(
        accessKeyId,
        secretAccessKey
      );

    const targetApp: Application = await this.resolveAppById(targetAppId);

    const deactivatedApp: Application | null =
      await this.appPersistenceService.updateApplication(targetApp.id, {
        isActive: false,
      });

    if (!deactivatedApp) {
      throw new AppNameCannotBeUpdatedError(targetApp.id);
    }

    await this.appSecretController.deleteAppSecret(deactivatedApp.id);
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
