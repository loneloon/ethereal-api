import { Application as ApplicationDto } from "@prisma-dual-cli/generated/aup-client";
import { AppPersistenceService } from "../aup/services/app-persistence-service";
import { UserProjectionPersistenceService } from "../aup/services/user-projection-persistence-service";
import { SecretPersistenceService } from "../ssd/services/secret-persistence-service";
import { SecretProcessingService } from "../ssd/services/secret-processing-service";
import { Secret } from "../ssd/models/secret";
import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";
import _ from "lodash";
import { validateEmailString } from "../shared/validators";
import { Application } from "../aup/models/application";
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
} from "../shared/custom-errors";
import { ApplicationKeysDto } from "../ssd/dtos/authentication";
import {
  mapApplicationDomainToPrivateApplicationViewDto,
  mapApplicationDomainToPublicApplicationViewDto,
} from "../aup/mappers/domain-to-dto";
import { PublicApplicationViewDto } from "../aup/dtos/application";

export class AppManagementController {
  constructor(
    readonly appPersistenceService: AppPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly secretPersistenceService: SecretPersistenceService,
    readonly secretProcessingService: SecretProcessingService
  ) {}

  private compileAppSecretSourceString(
    appId: string,
    uniqueCode: string,
    createdAt: DateTime
  ): string {
    return appId + uniqueCode + createdAt.toLocaleString();
  }

  private async createAppSecret(
    appId: string,
    createdAt: DateTime
  ): Promise<[secret: Secret, backupCode: string]> {
    const backupCode = uuid();
    const secretSource = this.compileAppSecretSourceString(
      appId,
      backupCode,
      createdAt
    );

    const [passHash, salt] =
      await this.secretProcessingService.generatePasswordHashAndSalt(
        secretSource
      );
    const newSecret: Secret | null =
      await this.secretPersistenceService.createSecret({
        externalId: appId,
        type: "APP",
        passHash,
        salt,
      });

    if (!newSecret) {
      throw new AppSecretCannotBeCreatedError(appId);
    }

    return [newSecret, backupCode];
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

  private async resolveAppByAccessKey(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<Application> {
    const secretId: string =
      this.secretProcessingService.encryptionService.decrypt(accessKeyId);
    const unverifiedHash: string =
      this.secretProcessingService.encryptionService.decrypt(secretAccessKey);

    const secret: Secret | null = await this.secretPersistenceService.getSecret(
      secretId,
      "APP"
    );

    if (!secret) {
      throw new InvalidAppAccessKeyError();
    }

    if (!_.isEqual(unverifiedHash, secret.passHash)) {
      throw new InvalidAppAccessKeyError();
    }

    const app: Application | null =
      await this.appPersistenceService.getApplicationById(secret.externalId);

    if (!app) {
      // This can happen if an application record was hard deleted but related secret wasn't deleted before/after that
      // We can communicate that application doesn't exist anymore, but this is considered a critical error and requires manual action
      console.warn(
        JSON.stringify({
          message:
            "[CRITICAL] Orphan secret detected! There is a leftover secret record that is linked to an app that doesn't exist anymore. Cannot resolve application!",
          appId: secret.externalId,
        })
      );
      throw new AppDoesntExistAnymoreWithAccessKeysError(secret.externalId);
    }

    if (!app.isActive) {
      // This can happen if an application record was deactivated but related secret wasn't deleted before/after that
      // We can communicate that application doesn't exist anymore, but this is considered a critical error and requires manual action
      console.warn(
        JSON.stringify({
          message:
            "[CRITICAL] Orphan secret detected! There is a leftover secret record that is linked to a deactivated app. Cannot resolve application!",
          appId: secret.externalId,
        })
      );
      throw new AppDoesntExistAnymoreWithAccessKeysError(secret.externalId);
    }

    return app;
  }

  public async resetAccessKeys(
    name: string,
    email: string,
    backupCode: string
  ): Promise<ApplicationKeysDto> {
    const targetApp: Application | null =
      await this.appPersistenceService.getApplicationByName(name);

    if (!targetApp || targetApp.email !== email) {
      throw new InvalidAppCredentialsError();
    }

    const secret: Secret | null = await this.secretPersistenceService.getSecret(
      targetApp.id,
      "APP"
    );

    if (!secret) {
      throw new AppHasNoAssociatedSecretError(targetApp.id);
    }

    const assumedAppSecretSourceString = this.compileAppSecretSourceString(
      targetApp.id,
      backupCode,
      targetApp.metadata.creationTimestamp
    );

    if (
      !(await this.secretProcessingService.checkPasswordAgainstHash(
        assumedAppSecretSourceString,
        secret.passHash,
        secret.salt
      ))
    ) {
      // Technically it would be more convenient to return "incorrect backup code" error,
      // but we don't want to encourage backup code bruteforcing so we just throw a general incorrect credentials error
      throw new InvalidAppCredentialsError();
    }

    const newBackupCode = uuid();

    const newSecretSource = this.compileAppSecretSourceString(
      targetApp.id,
      newBackupCode,
      targetApp.metadata.creationTimestamp
    );

    const [passHash, salt] =
      await this.secretProcessingService.generatePasswordHashAndSalt(
        newSecretSource
      );
    const updatedAppSecret: Secret | null =
      await this.secretPersistenceService.updateSecret(targetApp.id, "APP", {
        passHash,
        salt,
      });

    if (!updatedAppSecret) {
      throw new AppSecretCannotBeUpdatedError(targetApp.id);
    }

    return {
      accessKeyId: this.secretProcessingService.encryptionService.encrypt(
        updatedAppSecret.externalId
      ),
      secretAccessKey: this.secretProcessingService.encryptionService.encrypt(
        updatedAppSecret.passHash
      ),
      backupCode: newBackupCode,
    };
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
      const [newAppSecret, backupCode] = await this.createAppSecret(
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
    const targetApp: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );

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
    const targetApp: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );

    validateEmailString(email);

    const updatedApp: Application | null =
      await this.appPersistenceService.updateApplication(targetApp.id, {
        email,
      });

    if (!updatedApp) {
      throw new AppNameCannotBeUpdatedError(targetApp.id);
    }
  }

  public async getApp(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<Omit<ApplicationDto, "id" | "isActive">> {
    const app: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );

    return mapApplicationDomainToPrivateApplicationViewDto(app);
  }

  private async deleteAppSecret(appId: string): Promise<void> {
    const deletedSecret: Secret | null =
      await this.secretPersistenceService.deleteSecret(appId, "APP");

    if (!deletedSecret) {
      throw new AppSecretCannotBeDeletedError(appId);
    }
  }

  public async deactivateApp(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<void> {
    const targetApp: Application = await this.resolveAppByAccessKey(
      accessKeyId,
      secretAccessKey
    );

    const deactivatedApp: Application | null =
      await this.appPersistenceService.updateApplication(targetApp.id, {
        isActive: false,
      });

    if (!deactivatedApp) {
      throw new AppNameCannotBeUpdatedError(targetApp.id);
    }

    await this.deleteAppSecret(deactivatedApp.id);
  }

  public async getAppUsers() {}
}
