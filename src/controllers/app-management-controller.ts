import { AppPersistenceService } from "../aup/services/app-persistence-service";
import { UserProjectionPersistenceService } from "../aup/services/user-projection-persistence-service";
import { SessionPersistenceService } from "../ssd/services/session-persistence-service";
import { SecretPersistenceService } from "../ssd/services/secret-persistence-service";
import { SecretProcessingService } from "../ssd/services/secret-processing-service";
import { Secret } from "../ssd/models/secret";
import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";
import _ from "lodash";
import { validateEmailString } from "../shared/validators";
import { Application } from "../aup/models/application";
import {
  AppHasNoAssociatedSecretError,
  InvalidAppAccessKeyError,
  InvalidAppCredentialsError,
} from "../shared/custom-errors/categories/app/authentication";
import {
  AppCannotBeCreatedError,
  AppRollbackError,
  AppSecretCannotBeCreatedError,
} from "../shared/custom-errors/categories/app/registration";
import { AppSecretCannotBeUpdatedError } from "../shared/custom-errors/categories/app/update";
import { AppNameIsNotAvailableError } from "../shared/custom-errors/categories/app/validation";

export class AppManagementController {
  constructor(
    readonly appPersistenceService: AppPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly secretPersistenceService: SecretPersistenceService,
    readonly secretProcessingService: SecretProcessingService
  ) {}

  private compileAppSecretSourceString(
    appName: string,
    uniqueCode: string,
    createdAt: DateTime
  ): string {
    return appName + uniqueCode + createdAt.toLocaleString();
  }

  private async createAppSecret(
    appId: string,
    appName: string,
    createdAt: DateTime
  ): Promise<[secret: Secret, backupCode: string]> {
    const backupCode = uuid();
    const secretSource = this.compileAppSecretSourceString(
      appName,
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

  private async verifyAppSecret(accessKeyId: string, secretAccessKey: string) {
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

    return _.isEqual(unverifiedHash, secret.passHash);
  }

  public async resetAccessKeys(
    name: string,
    email: string,
    backupCode: string
  ) {
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
      targetApp.name,
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
      targetApp.name,
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
      newBackupCode,
    };
  }

  public async registerApp(name: string, email: string, url: string) {
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
        newApp.name,
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

  public async updateApp() {}

  public async getAppUsers() {}
}
