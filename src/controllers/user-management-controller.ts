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
import { UserPasswordHashCannotBeSavedError } from "@shared/custom-errors";

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
        userId,
        passHash,
        salt,
      });

    if (!newSecret) {
      throw new UserPasswordHashCannotBeSavedError(userId);
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
    try {
      validateEmailString(email);
      validatePasswordString(password);
    } catch (error: any) {
      throw new Error(
        JSON.stringify({
          message: "Couldn't create platform user!",
          error: JSON.parse(error.message),
        })
      );
    }

    const isEmailAddressAvailable: boolean = await this.checkEmailAvailability(
      email
    );

    // TechDebt: Implement custom errors so that they can be properly translated into http response status codes inside api handlers
    if (!isEmailAddressAvailable) {
      throw new Error(
        JSON.stringify({
          message: "Couldn't create platform user!",
          error: "Email address is not available!",
        })
      );
    }

    const newUser: User | null = await this.userPersistenceService.createUser({
      email,
    });

    if (!newUser) {
      throw new Error(
        JSON.stringify({
          message: "Couldn't create platform user record!",
        })
      );
    }

    try {
      const newUserSecret: Secret = await this.createPlatformUserSecret(
        newUser.id,
        password
      );
    } catch (error: any) {
      // This looks nasty, because of the cascading errors (but we need them all)
      // Refactor if you have a prettier solution
      console.warn("Performing user rollback! Aborting user creation!");
      const deletedUser = await this.userPersistenceService.deleteUser(
        newUser.id
      );

      if (!deletedUser) {
        throw new Error(
          JSON.stringify({
            message:
              "User rollback operation failed! Investigate persistence service state ASAP!",
          })
        );
      }

      throw new Error(
        JSON.stringify({
          message: "Couldn't create platform user!",
          error: JSON.parse(error.message),
        })
      );
    }
  }

  private async verifyPlatformUserPassword(
    userId: string,
    password: string
  ): Promise<boolean> {
    const secret: Secret | null =
      await this.secretPersistenceService.getSecretByUserId(userId);

    if (!secret) {
      throw new Error(
        JSON.stringify({
          message:
            "Warning! Registered user doesn't have a password associated with the account! This should never happen, please investigate current sign-up flow ASAP!",
          userId,
        })
      );
    }

    return await this.secretProcessingService.checkPasswordAgainstHash(
      password,
      secret.passHash,
      secret.salt
    );
  }

  // TODO: Add editPlatformUserPassword method (different flow in comparison to edit user: terminate active user sessions on pass change)

  // TODO: Add editPlatformUserEmail method (before applying update check that email is not occupied by anybody and then change isEmailVerified to false)

  // TechDebt: We need to re-evaluate the purpose of this method. It makes more sense to edit username separately
  async editPlatformUser(
    sessionId: string,
    // TechDebt: we shouldn't use a subset of persistance-related update interface; create separate custom types for input args exposed to user
    updateUserArgsDto: Omit<
      UpdateUserArgsDto,
      "email" | "emailIsVerified" | "isActive"
    >
  ): Promise<User> {
    // TechDebt: We need to verify that provided arguments are different from current user properties
    try {
      if (updateUserArgsDto.firstName) {
        validateFirstOrLastNameString(updateUserArgsDto.firstName);
      }

      if (updateUserArgsDto.lastName) {
        validateFirstOrLastNameString(updateUserArgsDto.lastName);
      }

      if (updateUserArgsDto.username) {
        validateUsernameString(updateUserArgsDto.username);
      }
    } catch (error: any) {
      throw new Error(
        JSON.stringify({
          message: "Invalid input! Skipping user update operation!",
          error: JSON.parse(error.message),
        })
      );
    }

    const targetUser: User = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    const updatedUser: User | null =
      await this.userPersistenceService.updateUser(
        targetUser.id,
        updateUserArgsDto
      );

    if (!updatedUser) {
      throw new Error(
        JSON.stringify({
          message: "Couldn't perform user update operation!",
        })
      );
    }

    return updatedUser;
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
      throw new Error(
        JSON.stringify({
          message: "Couldn't deactivate user!",
        })
      );
    }
  }

  // TODO: Get all active sessions for user

  private async resolveSessionById(sessionId: string): Promise<Session> {
    // Verifying if session is actually expired (this is technically redundant)
    const session: Session | null =
      await this.sessionPersistenceService.getSessionById(sessionId);

    if (!session) {
      throw new Error(
        JSON.stringify({
          message: "User session doesn't exist!",
          sessionId,
        })
      );
    }

    if (session && session.isExpired) {
      const deletedSession: Session | null =
        await this.sessionPersistenceService.deleteSession(sessionId);

      if (!deletedSession) {
        throw new Error(
          JSON.stringify({
            message:
              "Couldn't delete expired session! Please remove the session manually!",
            sessionId,
          })
        );
      }

      throw new Error(
        JSON.stringify({
          message: "User session has expired!",
        })
      );
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
      throw new Error(
        JSON.stringify({
          message:
            "Warning! Zombie session detected! There is an active session record that is linked to a user that doesn't exist anymore. Cannot resolve platform user!",
          sessionId: session.id,
          userId: session.userId,
        })
      );
    }

    if (!user.isActive) {
      // This can happen if a user record was deactivated but related sessions were not terminated/deleted before/after that
      throw new Error(
        JSON.stringify({
          message:
            "Warning! Zombie session detected! There is an active session record that is linked to a deactivated user. Cannot resolve platform user!",
          sessionId: session.id,
          userId: session.userId,
        })
      );
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
        throw new Error(
          JSON.stringify({
            message: "Couldn't create user device record!",
          })
        );
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
      throw new Error(
        JSON.stringify({ message: "Couldn't create platform user session!" })
      );
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
      throw new Error(
        JSON.stringify({
          message:
            "Cannot perform user sign-in operation: user with this email doesn't exist!",
        })
      );
    }

    if (!targetUser.isActive) {
      throw new Error(
        JSON.stringify({
          message:
            "Cannot perform user sign-in operation: target user is deactivated!",
        })
      );
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
        console.warn(error.message);
      }
    }

    const isMatchingPassword: boolean = await this.verifyPlatformUserPassword(
      targetUser.id,
      password
    );

    if (!isMatchingPassword) {
      throw new Error(
        JSON.stringify({
          message: "Incorrect credentials provided! Cannot sign-in!",
        })
      );
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
      throw new Error(
        JSON.stringify({
          message:
            "Couldn't terminate user session! Please remove the session record manually!",
        })
      );
    }

    return;
  }

  // AppUser (aka UserProjection in AUP model) refers to a connection between PlatformUser and an Application
  // that can have additional app-specific data attached to it:
  // i.e. alias, settings, roles, etc.
  async createAppUser(sessionId: string) {}

  async editAppUser(sessionId: string) {}

  async deactivateAppUser(sessionId: string) {}
}
