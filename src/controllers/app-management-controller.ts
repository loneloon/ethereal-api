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

export class AppManagementController {
  constructor(
    readonly appPersistenceService: AppPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly sessionPersistenceService: SessionPersistenceService,
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
      throw new Error();
      // throw new AppSecretCannotBeCreatedError(userId);
    }

    return [newSecret, backupCode];
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
      throw new Error();
      // throw new AccessKeyDoesntExist(userId);
    }

    return _.isEqual(unverifiedHash, secret.passHash);
  }

  private async resetAccessKeys(
    name: string,
    email: string,
    backupCode: string
  ): Promise<[accessKeyId: string, secretAccessKey: string]> {
    const targetApp: Application | null =
      await this.appPersistenceService.getApplicationByName(name);

    if (!targetApp || targetApp.email !== email) {
      throw new InvalidAppCredentials(); // 403 bad app auth
    }

    const secret: Secret | null = await this.secretPersistenceService.getSecret(
      targetApp.id,
      "APP"
    );

    if (!secret) {
      throw new AppSecretDoesntExist(); // Critical 500
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
      throw new InvalidAppCredentials(); // 403 bad app auth
    }

    // regenerate backupCode

    // update secret

    return [];
  }

  public async registerApp(name: string, email: string, url: string) {
    // INPUT VALIDATORS SECTION

    validateEmailString(email);

    const newApp: Application | null =
      await this.appPersistenceService.createApplication({
        name,
        email,
        url,
      });

    if (!newApp) {
      throw new AppCannotBeCreatedError(name);
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
      // This looks nasty, because of the cascading errors (but we need them all)
      // Refactor if you have a prettier solution
      console.warn("Performing app rollback! Aborting app creation!");
      const deletedApp = await this.appPersistenceService.deleteApplication(
        newApp.id
      );

      if (!deletedApp) {
        throw new AppRollbackError(name, newApp.id);
      }

      throw new AppCannotBeCreatedError(name);
    }
  }

  public async updateApp() {}

  public async getAppUsers() {}
}
