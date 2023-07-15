import { User } from "../../../aup/models/user";
import {
  InvalidOldPasswordInputError,
  UserAccountHasNoAssociatedSecretError,
  UserSecretCannotBeCreatedError,
  UserSecretCannotBeDeletedError,
  UserSecretCannotBeUpdatedError,
} from "../../../shared/custom-errors";
import { validatePasswordString } from "../../../shared/validators";
import { Secret } from "../../../ssd/models/secret";
import { SecretPersistenceService } from "../../../ssd/services/secret-persistence-service";
import { SecretProcessingService } from "../../../ssd/services/secret-processing-service";

export class UserSecretController {
  constructor(
    readonly secretPersistenceService: SecretPersistenceService,
    readonly secretProcessingService: SecretProcessingService
  ) {}

  public async createPlatformUserSecret(
    userId: string,
    password: string
  ): Promise<Secret> {
    const [passHash, salt] =
      await this.secretProcessingService.generatePasswordHashAndSalt(password);
    const newSecret: Secret | null =
      await this.secretPersistenceService.createSecret({
        externalId: userId,
        type: "USER",
        passHash,
        salt,
      });

    if (!newSecret) {
      throw new UserSecretCannotBeCreatedError(userId);
    }

    return newSecret;
  }

  public async verifyPlatformUserSecret(
    userId: string,
    password: string
  ): Promise<boolean> {
    const secret: Secret | null = await this.secretPersistenceService.getSecret(
      userId,
      "USER"
    );

    if (!secret) {
      throw new UserAccountHasNoAssociatedSecretError(userId);
    }

    return await this.secretProcessingService.checkPasswordAgainstHash(
      password,
      secret.passHash,
      secret.salt
    );
  }

  async updatePlatformUserSecret(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const isMatchingPassword = await this.verifyPlatformUserSecret(
      userId,
      oldPassword
    );

    if (!isMatchingPassword) {
      throw new InvalidOldPasswordInputError();
    }

    validatePasswordString(newPassword);

    const [passHash, salt] =
      await this.secretProcessingService.generatePasswordHashAndSalt(
        newPassword
      );

    const updatedUserSecret: Secret | null =
      await this.secretPersistenceService.updateSecret(userId, "USER", {
        passHash,
        salt,
      });

    if (!updatedUserSecret) {
      throw new UserSecretCannotBeUpdatedError(userId);
    }

    // TODO: We need to terminate all other user's sessions except for this device
  }

  public async deleteUserSecret(userId: string): Promise<void> {
    const deletedSecret: Secret | null =
      await this.secretPersistenceService.deleteSecret(userId, "USER");

    if (!deletedSecret) {
      throw new UserSecretCannotBeDeletedError(userId);
    }
  }
}
