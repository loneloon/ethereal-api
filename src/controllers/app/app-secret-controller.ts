import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";
import { SecretPersistenceService } from "../../ssd/services/secret-persistence-service";
import { SecretProcessingService } from "../../ssd/services/secret-processing-service";
import { Secret } from "../../ssd/models/secret";
import {
  AppHasNoAssociatedSecretError,
  AppSecretCannotBeCreatedError,
  AppSecretCannotBeDeletedError,
  AppSecretCannotBeUpdatedError,
  InvalidAppAccessKeyError,
  InvalidAppCredentialsError,
} from "../../shared/custom-errors";
import { Application } from "../../aup/models/application";
import { ApplicationKeysDto } from "../../ssd/dtos/authentication";
import _ from "lodash";

export class AppSecretController {
  constructor(
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

  public async createAppSecret(
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

  public async resolveAppIdByAccessKey(
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<string> {
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

    return secret.externalId;
  }

  public async resetAccessKeys(
    appId: string,
    appCreationTimestamp: DateTime,
    backupCode: string
  ): Promise<ApplicationKeysDto> {
    const secret: Secret | null = await this.secretPersistenceService.getSecret(
      appId,
      "APP"
    );

    if (!secret) {
      throw new AppHasNoAssociatedSecretError(appId);
    }

    const assumedAppSecretSourceString = this.compileAppSecretSourceString(
      appId,
      backupCode,
      appCreationTimestamp
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
      appId,
      newBackupCode,
      appCreationTimestamp
    );

    const [passHash, salt] =
      await this.secretProcessingService.generatePasswordHashAndSalt(
        newSecretSource
      );
    const updatedAppSecret: Secret | null =
      await this.secretPersistenceService.updateSecret(appId, "APP", {
        passHash,
        salt,
      });

    if (!updatedAppSecret) {
      throw new AppSecretCannotBeUpdatedError(appId);
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

  public async deleteAppSecret(appId: string): Promise<void> {
    const deletedSecret: Secret | null =
      await this.secretPersistenceService.deleteSecret(appId, "APP");

    if (!deletedSecret) {
      throw new AppSecretCannotBeDeletedError(appId);
    }
  }
}
