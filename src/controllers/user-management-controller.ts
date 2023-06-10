import { AppPersistenceService } from "../aup/services/app-persistence-service";
import { User as UserDto } from "@prisma-dual-cli/generated/aup-client";
import {
  UpdateUserArgsDto,
  UserPersistenceService,
} from "../aup/services/user-persistence-service";
import { UserProjectionPersistenceService } from "../aup/services/user-projection-persistence-service";
import { DevicePersistenceService } from "../ssd/services/device-persistence-service";
import { SecretPersistenceService } from "../ssd/services/secret-persistence-service";
import { SessionPersistenceService } from "../ssd/services/session-persistence-service";
import { SecretProcessingService } from "../ssd/services/secret-processing-service";
import { User } from "../aup/models/user";
import { Secret } from "../ssd/models/secret";
import { Session } from "../ssd/models/session";
import { Device } from "../ssd/models/device";
import { DateTime } from "luxon";
import {
  validateEmailString,
  validateFirstOrLastNameString,
  validatePasswordString,
  validateUsernameString,
} from "@shared/validators";
import { mapUserDomainToDto } from "../aup/mappers/domain-to-dto";
import {
  ExpiredUserSessionCannotBeDeletedError,
  InvalidOldPasswordInputError,
  InvalidUserCredentialsError,
  UserAccountCannotBeCreatedError,
  UserAccountCannotBeDeactivatedError,
  UserAccountDoesntExistAnymoreError,
  UserAccountDoesntExistAnymoreWithSessionsError,
  UserAccountHasNoAssociatedSecretError,
  UserAccountRollbackError,
  UserDeviceCannotBeCreatedError,
  UserEmailCannotBeUpdatedError,
  UserEmailIsNotAvailableError,
  UserIsNotAuthenticatedError,
  UserNameCannotBeUpdatedError,
  UserSecretCannotBeCreatedError,
  UserSecretCannotBeDeletedError,
  UserSecretCannotBeUpdatedError,
  UserSessionCannotBeCreatedError,
  UserSessionCannotBeDeletedError,
  UserSessionHasExpiredError,
  UserUsernameCannotBeUpdatedError,
} from "@shared/custom-errors";

export class UserManagementController {
  constructor(
    readonly userPersistenceService: UserPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly appPersistenceService: AppPersistenceService,
    readonly sessionPersistenceService: SessionPersistenceService,
    readonly secretPersistenceService: SecretPersistenceService,
    readonly devicePersistenceService: DevicePersistenceService,
    readonly secretProcessingService: SecretProcessingService
  ) {}

  private async createPlatformUserSecret(
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

  private async checkEmailAvailability(email: string): Promise<boolean> {
    const user: User | null = await this.userPersistenceService.getUserByEmail(
      email
    );

    if (user && user.isActive) {
      return false;
    } else if (user && !user.isActive) {
      // TODO: There is a complicated edge-case where we need to account for
      // returning users that previously "deleted" their accounts, but in our logic we deactivate them instead of deleting
      return false;
    }
    return true;
  }

  // PlatformUser (aka User in AUP model) refers to base/root user account
  // that acts as a central node to all application accounts that user may have
  async createPlatformUser(email: string, password: string): Promise<void> {
    // INPUT VALIDATORS SECTION

    validateEmailString(email);
    validatePasswordString(password);

    const isEmailAddressAvailable: boolean = await this.checkEmailAvailability(
      email
    );

    if (!isEmailAddressAvailable) {
      throw new UserEmailIsNotAvailableError();
    }

    const newUser: User | null = await this.userPersistenceService.createUser({
      email,
    });

    if (!newUser) {
      throw new UserAccountCannotBeCreatedError(email);
    }

    try {
      const newUserSecret: Secret = await this.createPlatformUserSecret(
        newUser.id,
        password
      );
    } catch (error: any) {
      console.warn("Performing user rollback! Aborting user creation!");
      const deletedUser = await this.userPersistenceService.deleteUser(
        newUser.id
      );

      if (!deletedUser) {
        throw new UserAccountRollbackError(email, newUser.id);
      }

      throw new UserAccountCannotBeCreatedError(email);
    }
  }

  private async verifyPlatformUserSecret(
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

  async updatePlatformUserEmail(
    sessionId: string,
    email: string
  ): Promise<void> {
    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    validateEmailString(email);

    const isEmailAddressAvailable: boolean = await this.checkEmailAvailability(
      email
    );

    if (!isEmailAddressAvailable) {
      throw new UserEmailIsNotAvailableError();
    }

    const updatedUser: User | null =
      await this.userPersistenceService.updateUser(targetUser.id, { email });

    if (!updatedUser) {
      throw new UserEmailCannotBeUpdatedError(targetUser.id);
    }

    // TODO: Implement mailing service & email verification handler + temporary verification tokens table
    // Additionally disallow app linking and extended permissions if email is unverified
  }

  // TODO: All update operations should check if new submitted values are different from the old ones.
  // Disallow update if equal

  async updatePlatformUserPassword(
    sessionId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    const isMatchingPassword = await this.verifyPlatformUserSecret(
      targetUser.id,
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
      await this.secretPersistenceService.updateSecret(targetUser.id, "USER", {
        passHash,
        salt,
      });

    if (!updatedUserSecret) {
      throw new UserSecretCannotBeUpdatedError(targetUser.id);
    }

    // TODO: We need to terminate all other user's sessions except for this device
  }

  async updatePlatformUserUsername(
    sessionId: string,
    username: string
  ): Promise<void> {
    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    validateUsernameString(username);

    const updatedUser: User | null =
      await this.userPersistenceService.updateUser(targetUser.id, { username });

    if (!updatedUser) {
      throw new UserUsernameCannotBeUpdatedError(targetUser.id);
    }
  }

  async updatePlatformUserName(
    sessionId: string,
    firstName: string,
    lastName: string
  ): Promise<void> {
    validateFirstOrLastNameString(firstName);

    validateFirstOrLastNameString(lastName);

    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    const updatedUser: User | null =
      await this.userPersistenceService.updateUser(targetUser.id, {
        firstName,
        lastName,
      });

    if (!updatedUser) {
      throw new UserNameCannotBeUpdatedError(targetUser.id);
    }
  }

  async deactivatePlatformUser(sessionId: string): Promise<void> {
    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    const allUserSessions: Session[] =
      await this.sessionPersistenceService.getSessionsByUserId(targetUser.id);
    const allUserSessionIds: string[] = allUserSessions.map(
      (session) => session.id
    );

    const deletedSessions: (Session | null)[] = await Promise.all(
      allUserSessions.map(
        async (session): Promise<Session | null> =>
          this.sessionPersistenceService.deleteSession(session.id)
      )
    );
    const deletedSessionIds: string[] = deletedSessions
      .filter((session) => session !== null)
      .map((session) => session!.id);

    const unterminatedSessions: string[] = allUserSessionIds.reduce(
      (res: string[], seshId: string) => {
        if (!deletedSessionIds.includes(seshId)) {
          return [...res, seshId];
        }
        return res;
      },
      []
    );

    if (unterminatedSessions) {
      console.warn(
        JSON.stringify({
          message:
            "Warning! Some of the user's sessions could not be terminated! Please remove them manually!",
          unterminatedSessions,
        })
      );
    }

    const deactivatedUser = await this.userPersistenceService.updateUser(
      targetUser.id,
      {
        isActive: false,
      }
    );

    if (!deactivatedUser) {
      throw new UserAccountCannotBeDeactivatedError(targetUser.id);
    }

    await this.deleteUserSecret(deactivatedUser.id);
  }

  // TODO: Get all active sessions for user

  private async resolveSessionById(sessionId: string): Promise<Session> {
    // Verifying if session is actually expired (this is technically redundant)
    const session: Session | null =
      await this.sessionPersistenceService.getSessionById(sessionId);

    if (!session) {
      throw new UserIsNotAuthenticatedError();
    }

    if (session && session.isExpired) {
      const deletedSession: Session | null =
        await this.sessionPersistenceService.deleteSession(sessionId);

      if (!deletedSession) {
        throw new ExpiredUserSessionCannotBeDeletedError(sessionId);
      }

      // Should trigger 302 with redirect to signIn page
      // But this should be delegated to apps, as we are expecting proxy authentication most of the time
      throw new UserSessionHasExpiredError();
    }

    return session;
  }

  private async resolvePlatformUserBySessionId(
    sessionId: string
  ): Promise<User> {
    const session: Session = await this.resolveSessionById(sessionId);

    const user: User | null = await this.userPersistenceService.getUserById(
      session.userId
    );

    if (!user) {
      // This can happen if a user record was hard deleted but related sessions were not terminated/deleted before/after that
      // We can communicate that account doesn't exist anymore, but this is considered a critical error and requires manual action
      console.warn(
        JSON.stringify({
          message:
            "[CRITICAL] Zombie session detected! There is an active session record that is linked to a user that doesn't exist anymore. Cannot resolve platform user!",
          sessionId: session.id,
          userId: session.userId,
        })
      );
      throw new UserAccountDoesntExistAnymoreWithSessionsError();
    }

    if (!user.isActive) {
      // This can happen if a user record was deactivated but related sessions were not terminated/deleted before/after that
      // We can communicate that account doesn't exist anymore, but this is considered a critical error and requires manual action
      console.warn(
        JSON.stringify({
          message:
            "[CRITICAL] Zombie session detected! There is an active session record that is linked to a deactivated user. Cannot resolve platform user!",
          sessionId: session.id,
          userId: session.userId,
        })
      );
      throw new UserAccountDoesntExistAnymoreWithSessionsError();
    }

    return user;
  }

  private async resolvePlatformUserDevice(
    userAgent: string,
    ip: string,
    userId: string
  ): Promise<Device> {
    let userDevice: Device | null =
      await this.devicePersistenceService.getDeviceByUserAgentAndIp(
        userAgent,
        ip
      );

    if (!userDevice) {
      console.log(
        JSON.stringify({
          message: "User is signing in with a new device!",
          userId,
          userAgent,
          ip,
        })
      );

      const newUserDevice = await this.devicePersistenceService.createDevice({
        userAgent,
        ip,
      });

      if (!newUserDevice) {
        throw new UserDeviceCannotBeCreatedError(userId, userAgent, ip);
      }

      return newUserDevice;
    }

    return userDevice;
  }

  async getPlatformUser(
    sessionId: string
  ): Promise<Omit<UserDto, "id" | "isActive">> {
    const currentUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    return mapUserDomainToDto(currentUser);
  }

  private async createPlatformUserSession(
    deviceId: string,
    userId: string
  ): Promise<Session> {
    // TechDebt: The default value for this should be defined by platform config
    const sessionExpiryDate: DateTime = DateTime.now().plus({ hours: 24 });

    const newSession = await this.sessionPersistenceService.createSession({
      id: await this.secretProcessingService.generateUniqueHashString(),
      deviceId,
      userId,
      expiresAt: sessionExpiryDate.toJSDate(),
    });

    if (!newSession) {
      throw new UserSessionCannotBeCreatedError(userId, deviceId);
    }

    return newSession;
  }

  async signInPlatformUser(
    email: string,
    password: string,
    userAgent: string,
    ip: string
  ): Promise<Session> {
    const targetUser: User | null =
      await this.userPersistenceService.getUserByEmail(email);

    if (!targetUser) {
      throw new InvalidUserCredentialsError();
    }

    if (!targetUser.isActive) {
      throw new UserAccountDoesntExistAnymoreError();
    }

    const userDevice: Device = await this.resolvePlatformUserDevice(
      userAgent,
      ip,
      targetUser.id
    );

    if (userDevice.sessionId) {
      try {
        // If session for this device exists and is active it will be returned
        // If session exists but is expired it will be wiped and session resolver will throw
        // If session doesn't exist session resolver will throw
        return await this.resolveSessionById(userDevice.sessionId);
      } catch (error: any) {
        // We can just catch the error here without throwing, this behaviour is expected.
        // If error logging is enabled, errors will be logged anyway.
      }
    }

    const isMatchingPassword: boolean = await this.verifyPlatformUserSecret(
      targetUser.id,
      password
    );

    if (!isMatchingPassword) {
      throw new InvalidUserCredentialsError();
    }

    return await this.createPlatformUserSession(userDevice.id, targetUser.id);
  }

  async terminatePlatformUserSession(sessionId: string): Promise<void> {
    const session: Session = await this.resolveSessionById(sessionId);

    const deletedSession = await this.sessionPersistenceService.deleteSession(
      session.id
    );

    // If session persistence operation is performed successfully (i.e. create, read, update, delete), a session instance will be returned
    if (!deletedSession) {
      throw new UserSessionCannotBeDeletedError(sessionId);
    }

    return;
  }

  private async deleteUserSecret(userId: string): Promise<void> {
    const deletedSecret: Secret | null =
      await this.secretPersistenceService.deleteSecret(userId, "USER");

    if (!deletedSecret) {
      throw new UserSecretCannotBeDeletedError(userId);
    }
  }

  // AppUser (aka UserProjection in AUP model) refers to a connection between PlatformUser and an Application
  // that can have additional app-specific data attached to it:
  // i.e. alias, settings, roles, etc.
  async createAppUser(sessionId: string) {}

  async editAppUser(sessionId: string) {}

  async deactivateAppUser(sessionId: string) {}
}
