import { AppPersistenceService } from "../../aup/services/app-persistence-service";
import { User as UserDto } from "@prisma-dual-cli/generated/aup-client";
import {
  UpdateUserArgsDto,
  UserPersistenceService,
} from "../../aup/services/user-persistence-service";
import { UserProjectionPersistenceService } from "../../aup/services/user-projection-persistence-service";
import { DevicePersistenceService } from "../../ssd/services/device-persistence-service";
import { SecretPersistenceService } from "../../ssd/services/secret-persistence-service";
import { SessionPersistenceService } from "../../ssd/services/session-persistence-service";
import { SecretProcessingService } from "../../ssd/services/secret-processing-service";
import { User } from "../../aup/models/user";
import { Secret } from "../../ssd/models/secret";
import { Session } from "../../ssd/models/session";
import { Device } from "../../ssd/models/device";
import { DateTime } from "luxon";
import {
  validateEmailString,
  validateFirstOrLastNameString,
  validatePasswordString,
  validateUsernameString,
} from "@shared/validators";
import {
  mapApplicationDomainToPublicApplicationViewDto,
  mapUserDomainToDto,
  mapUserProjectionDomainToAppUserDto,
} from "../../aup/mappers/domain-to-dto";
import {
  AppDoesntExistError,
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
  AppUserCannotBeCreatedError,
  AppUserAlreadyExistsError,
  AppUserCannotBeDeactivatedError,
  AppUserCannotBeReactivatedError,
  AppUserDoesntExistError,
} from "@shared/custom-errors";
import { UserProjection } from "../../aup/models/user-projection";
import { Application } from "../../aup/models/application";
import { AppUserDto } from "../../aup/dtos/user-projection";
import { SessionCookieDto, SessionStatus } from "../../ssd/dtos/authentication";
import {
  PublicApplicationViewDto,
  UserRelatedApplicationViewDto,
} from "../../aup/dtos/application";
import { UserSecretController } from "./sub-controllers/user-secret-controller";
import { UserUpdateController } from "./sub-controllers/user-update-controller";
import { UserSessionController } from "./sub-controllers/user-session.controller";
import { AppUserController } from "./sub-controllers/app-user-controller";

export class UserManagementController {
  private readonly userSecretController: UserSecretController;
  private readonly userUpdateController: UserUpdateController;
  private readonly userSessionController: UserSessionController;
  private readonly appUserController: AppUserController;

  constructor(
    readonly userPersistenceService: UserPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly appPersistenceService: AppPersistenceService,
    readonly sessionPersistenceService: SessionPersistenceService,
    readonly secretPersistenceService: SecretPersistenceService,
    readonly devicePersistenceService: DevicePersistenceService,
    readonly secretProcessingService: SecretProcessingService
  ) {
    this.userSecretController = new UserSecretController(
      this.secretPersistenceService,
      this.secretProcessingService
    );
    this.userUpdateController = new UserUpdateController(
      this.userPersistenceService
    );
    this.userSessionController = new UserSessionController(
      this.sessionPersistenceService,
      this.secretProcessingService
    );
    this.appUserController = new AppUserController(
      this.userProjectionPersistenceService,
      this.appPersistenceService
    );
  }

  async getPlatformUser(
    sessionId: string
  ): Promise<Omit<UserDto, "id" | "isActive">> {
    const currentUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    return mapUserDomainToDto(currentUser);
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
      const newUserSecret: Secret =
        await this.userSecretController.createPlatformUserSecret(
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

    await this.userSecretController.updatePlatformUserSecret(
      targetUser.id,
      oldPassword,
      newPassword
    );
  }

  async updatePlatformUserEmail(
    sessionId: string,
    email: string
  ): Promise<void> {
    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    const isEmailAddressAvailable: boolean = await this.checkEmailAvailability(
      email
    );

    if (!isEmailAddressAvailable) {
      throw new UserEmailIsNotAvailableError();
    }

    await this.userUpdateController.updatePlatformUserEmail(
      targetUser.id,
      email
    );
  }

  async updatePlatformUserUsername(
    sessionId: string,
    username: string
  ): Promise<void> {
    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    await this.userUpdateController.updatePlatformUserUsername(
      targetUser.id,
      username
    );
  }

  async updatePlatformUserName(
    sessionId: string,
    firstName: string,
    lastName: string
  ): Promise<void> {
    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    await this.userUpdateController.updatePlatformUserName(
      targetUser.id,
      firstName,
      lastName
    );
  }

  async deactivatePlatformUser(sessionId: string): Promise<void> {
    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    await this.userSessionController.deleteAllUserSessions(targetUser.id);

    await this.userUpdateController.deactivatePlatformUser(targetUser.id);

    await this.userSecretController.deleteUserSecret(targetUser.id);
    await this.deleteAllUserProjections(targetUser.id);
  }

  private async deleteAllUserProjections(userId: string): Promise<void> {
    const allUserProjections: UserProjection[] =
      await this.userProjectionPersistenceService.getProjectionsByUserId(
        userId
      );
    const allUserProjectionsAppIds = allUserProjections.map(
      (projection) => projection.appId
    );

    const deletedProjections: (UserProjection | null)[] = await Promise.all(
      allUserProjections.map(
        async (projection): Promise<UserProjection | null> =>
          this.userProjectionPersistenceService.deleteUserProjection(
            projection.appId,
            projection.userId
          )
      )
    );
    const deletedProjectionsAppIds: string[] = deletedProjections
      .filter((projection) => projection !== null)
      .map((projection) => projection!.appId);

    const undeletedProjectionsAppIds: string[] =
      allUserProjectionsAppIds.reduce((res: string[], appId: string) => {
        if (!deletedProjectionsAppIds.includes(appId)) {
          return [...res, appId];
        }
        return res;
      }, []);

    if (undeletedProjectionsAppIds) {
      console.warn(
        JSON.stringify({
          message:
            "Warning! Some of the user projections could not be deleted! Please remove them manually!",
          undeletedProjectionsAppIds,
        })
      );
    }
  }

  // ======================================
  //   PLATFORM USER AUTH/SESSION METHODS
  // ======================================

  // TODO: Get all active sessions for user

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
        return await this.userSessionController.resolveSessionById(
          userDevice.sessionId
        );
      } catch (error: any) {
        // We can just catch the error here without throwing, this behaviour is expected.
        // If error logging is enabled, errors will be logged anyway.
      }
    }

    const isMatchingPassword: boolean =
      await this.userSecretController.verifyPlatformUserSecret(
        targetUser.id,
        password
      );

    if (!isMatchingPassword) {
      throw new InvalidUserCredentialsError();
    }

    return await this.userSessionController.createPlatformUserSession(
      userDevice.id,
      targetUser.id
    );
  }

  async signOutPlatformUser(sessionId: string): Promise<void> {
    await this.userSessionController.terminatePlatformUserSession(sessionId);
  }

  async getPlatformUserSessionStatus(
    sessionId: string
  ): Promise<SessionStatus> {
    return await this.userSessionController.getPlatformUserSessionStatus(
      sessionId
    );
  }

  async getPlatformUserSessionCookie(
    sessionId: string
  ): Promise<SessionCookieDto> {
    return await this.userSessionController.issueSessionCookie(sessionId);
  }

  // ======================================
  //               RESOLVERS
  // ======================================

  private async resolvePlatformUserBySessionId(
    sessionId: string
  ): Promise<User> {
    const session: Session =
      await this.userSessionController.resolveSessionById(sessionId);

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

  private async resolveAppByName(appName: string): Promise<Application> {
    const app: Application | null =
      await this.appPersistenceService.getApplicationByName(appName);

    if (!app) {
      throw new AppDoesntExistError(appName);
    }

    return app;
  }

  // ======================================
  //           APP USER METHODS
  // ======================================

  public async getAppUser(
    sessionId: string,
    appName: string
  ): Promise<AppUserDto> {
    const user: User = await this.resolvePlatformUserBySessionId(sessionId);
    const app: Application = await this.resolveAppByName(appName);

    return this.appUserController.getAppUser(
      user.id,
      user.email,
      app.id,
      app.name
    );
  }

  public async getAppUrl(sessionId: string, appName: string): Promise<string> {
    const user: User = await this.resolvePlatformUserBySessionId(sessionId);
    const app: Application = await this.resolveAppByName(appName);
    // We don't need the app user, but this call will act as a validator, it will throw if platform user is not following the target app
    const appUser = await this.appUserController.getAppUser(
      user.id,
      user.email,
      app.id,
      app.name
    );

    return app.url;
  }

  public async getUserFollowedApps(
    sessionId: string
  ): Promise<PublicApplicationViewDto[]> {
    const user: User = await this.resolvePlatformUserBySessionId(sessionId);

    return await this.appUserController.getUserFollowedApps(user.id);
  }

  public async getAppsForUser(
    sessionId: string
  ): Promise<UserRelatedApplicationViewDto[]> {
    const user: User = await this.resolvePlatformUserBySessionId(sessionId);

    return await this.appUserController.getAppsForUser(user.id);
  }

  async followApp(sessionId: string, appName: string, alias: string) {
    const user: User = await this.resolvePlatformUserBySessionId(sessionId);
    const app: Application = await this.resolveAppByName(appName);

    // Checking if the app user already exists
    const appUser: UserProjection | null =
      await this.userProjectionPersistenceService.getProjectionByAppAndUserId(
        app.id,
        user.id
      );

    if (appUser) {
      if (appUser.isActive) {
        throw new AppUserAlreadyExistsError(user.email, app.name);
      }

      await this.appUserController.reactivateAppUser(
        appUser.appId,
        appUser.userId
      );
    } else {
      await this.appUserController.createAppUser(app.id, user.id, alias);
    }
  }

  async unfollowApp(sessionId: string, appName: string): Promise<void> {
    const user: User = await this.resolvePlatformUserBySessionId(sessionId);
    const app: Application = await this.resolveAppByName(appName);

    const appUser: UserProjection | null =
      await this.userProjectionPersistenceService.getProjectionByAppAndUserId(
        app.id,
        user.id
      );

    if (!appUser || !appUser.isActive) {
      throw new AppUserDoesntExistError(app.name, user.email);
    }

    await this.appUserController.deactivateAppUser(app.id, user.id);
  }
}
