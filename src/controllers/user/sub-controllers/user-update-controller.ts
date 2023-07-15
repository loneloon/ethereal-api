import { User } from "../../../aup/models/user";
import { UserPersistenceService } from "../../../aup/services/user-persistence-service";
import {
  UserAccountCannotBeDeactivatedError,
  UserEmailCannotBeUpdatedError,
  UserNameCannotBeUpdatedError,
  UserUsernameCannotBeUpdatedError,
} from "../../../shared/custom-errors";
import {
  validateEmailString,
  validateFirstOrLastNameString,
  validateUsernameString,
} from "../../../shared/validators";

export class UserUpdateController {
  constructor(readonly userPersistenceService: UserPersistenceService) {}

  // TODO: All update operations should check if new submitted values are different from the old ones.
  // Disallow update if equal

  async updatePlatformUserEmail(userId: string, email: string): Promise<void> {
    validateEmailString(email);

    const updatedUser: User | null =
      await this.userPersistenceService.updateUser(userId, { email });

    if (!updatedUser) {
      throw new UserEmailCannotBeUpdatedError(userId);
    }

    // TODO: Implement mailing service & email verification handler + temporary verification tokens table
    // Additionally disallow app linking and extended permissions if email is unverified
  }

  async updatePlatformUserUsername(
    userId: string,
    username: string
  ): Promise<void> {
    validateUsernameString(username);

    const updatedUser: User | null =
      await this.userPersistenceService.updateUser(userId, { username });

    if (!updatedUser) {
      throw new UserUsernameCannotBeUpdatedError(userId);
    }
  }

  async updatePlatformUserName(
    userId: string,
    firstName: string,
    lastName: string
  ): Promise<void> {
    validateFirstOrLastNameString(firstName);

    validateFirstOrLastNameString(lastName);

    const updatedUser: User | null =
      await this.userPersistenceService.updateUser(userId, {
        firstName,
        lastName,
      });

    if (!updatedUser) {
      throw new UserNameCannotBeUpdatedError(userId);
    }
  }

  async deactivatePlatformUser(userId: string): Promise<void> {
    const deactivatedUser = await this.userPersistenceService.updateUser(
      userId,
      {
        isActive: false,
      }
    );

    if (!deactivatedUser) {
      throw new UserAccountCannotBeDeactivatedError(userId);
    }
  }
}
