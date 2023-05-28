import { DateTime } from "luxon";
import { AppPersistenceService } from "../aup/services/app-persistence-service";
import { UserPersistenceService } from "../aup/services/user-persistence-service";
import { UserProjectionPersistenceService } from "../aup/services/user-projection-persistence-service";
import { DevicePersistenceService } from "../ssd/services/device-persistence-service";
import { SecretPersistenceService } from "../ssd/services/secret-persistence-service";
import { SessionPersistenceService } from "../ssd/services/session-persistence-service";
import { SecretProcessingService } from "../ssd/services/secret-processing-service";
import { User } from "../aup/models/user";
import { Secret } from "../ssd/models/secret";

export class UserManagementController {
  constructor(
    readonly userPersistenceService: UserPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly appPersistenceService: AppPersistenceService,
    readonly sessionPersistenceService: SessionPersistenceService,
    readonly secretPersistenceService: SecretPersistenceService,
    readonly devicePersistenceService: DevicePersistenceService
  ) {}

  // PlatformUser (aka User in AUP model) refers to base/root user account
  // that acts as a central node to all application accounts that user may have
  async createPlatformUser(email: string, password: string) {
    const createdUser: User | null =
      await this.userPersistenceService.createUser({ email });

    if (!createdUser) {
      console.warn(
        JSON.stringify({
          message: "Couldn't create platform user!",
        })
      );
      return null;
    }

    const [passHash, salt] =
      await SecretProcessingService.generatePasswordHashAndSalt(password);
    const createdSecret: Secret | null =
      await this.secretPersistenceService.createSecret({
        userId: createdUser.id,
        passHash,
        salt,
      });

    // TODO: Map to DTO before returning
    return createdUser;
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    const user = await this.userPersistenceService.getUserByEmail(email);

    if (user && user.isActive) {
      return false;
    } else if (user && !user.isActive) {
      // TODO: There is a complicated edge-case where we need to account for
      // returning users that previously "deleted" their accounts, but in our logic we deactivate them instead of deleting
      return false;
    }
    return true;
  }

  async editPlatformUser(sessionId: string) {}

  async deactivatePlatformUser(sessionId: string) {}

  // AppUser (aka UserProjection in AUP model) refers to a connection between PlatformUser and an Application
  // that can have additional app-specific data attached to it:
  // i.e. alias, settings, roles, etc.
  async createAppUser(sessionId: string) {}

  async editAppUser(sessionId: string) {}

  async deactivateAppUser(sessionId: string) {}
}
