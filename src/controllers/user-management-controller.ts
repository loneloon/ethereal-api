import { AppPersistenceService } from "../aup/services/app-persistence-service";
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

  async editPlatformUser(
    sessionId: string,
    updateUserArgsDto: UpdateUserArgsDto
  ): Promise<User | null> {
    const targetUser: User | null = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    if (!targetUser) {
      console.warn(
        JSON.stringify({
          message: "Cannot perform user update operation: user doesn't exist!",
        })
      );

      return null;
    }

    if (!targetUser.isActive) {
      console.warn(
        JSON.stringify({
          message:
            "Cannot perform user update operation: target user is deactivated!",
        })
      );

      return null;
    }

    const updatedUser: User | null =
      await this.userPersistenceService.updateUser(
        targetUser.id,
        updateUserArgsDto
      );
    return updatedUser;
  }

  async deactivatePlatformUser(sessionId: string): Promise<User | null> {
    const targetUser: User | null = await this.resolvePlatformUserBySessionId(
      sessionId
    );

    if (!targetUser) {
      console.warn(
        JSON.stringify({
          message:
            "Cannot perform user deactivation operation: user doesn't exist!",
        })
      );

      return null;
    }

    if (!targetUser.isActive) {
      console.warn(
        JSON.stringify({
          message: "User is already deactivated! Skipping operation!",
        })
      );

      return targetUser;
    }

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

    console.warn(
      JSON.stringify({
        message:
          "Warning! Some of the user's sessions could not be terminated! Please remove them manually!",
        unterminatedSessions,
      })
    );

    return await this.userPersistenceService.updateUser(targetUser.id, {
      isActive: false,
    });
  }

  private async resolveSessionById(sessionId: string): Promise<Session | null> {
    // Verifying if session is actually expired (this is technically redundant)
    const session: Session | null =
      await this.sessionPersistenceService.getSessionById(sessionId);

    if (!session) {
      console.warn(
        JSON.stringify({
          message: "User session doesn't exist!",
          sessionId,
        })
      );
      return null;
    }

    if (session && session.isExpired) {
      console.warn(
        JSON.stringify({
          message: "User session has expired! Wiping session record!",
          sessionId,
        })
      );

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

      return null;
    }

    return session;
  }

  private async resolvePlatformUserBySessionId(
    sessionId: string
  ): Promise<User | null> {
    const session: Session | null = await this.resolveSessionById(sessionId);

    if (!session) {
      console.warn(
        JSON.stringify({
          message: "Cannot resolve platform user, session doesn't exist!",
          sessionId,
        })
      );
      return null;
    }

    const user: User | null = await this.userPersistenceService.getUserById(
      session.userId
    );

    if (!user) {
      // This can happen if a user record was hard deleted but related sessions were not terminated/deleted before/after that
      console.warn(
        JSON.stringify({
          message:
            "Warning! There is an active session record that is linked to a user that doesn't exist anymore. Cannot resolve platform user!",
          sessionId: session.id,
          userId: session.userId,
        })
      );
      return null;
    }

    return user;
  }

  async signInPlatformUser(
    email: string,
    password: string,
    userAgent: string,
    ip: string
  ): Promise<Session | null> {
    const targetUser: User | null =
      await this.userPersistenceService.getUserByEmail(email);

    if (!targetUser) {
      console.warn(
        JSON.stringify({
          message:
            "Cannot perform user sign-in operation: user with this email doesn't exist!",
        })
      );
      return null;
    }

    if (!targetUser.isActive) {
      console.warn(
        JSON.stringify({
          message:
            "Cannot perform user sign-in operation: target user is deactivated!",
        })
      );

      return null;
    }

    let userDevice: Device | null =
      await this.devicePersistenceService.getDeviceByUserAgentAndIp(
        userAgent,
        ip
      );
    let session: Session | null = null;

    if (userDevice) {
      // Checking if user is already signed in on this device
      if (userDevice.sessionId) {
        try {
          // If session is expired it will wipe itself and resolve to null
          session = await this.resolveSessionById(userDevice.sessionId);
        } catch (error) {
          console.warn(error);
        }

        // If session for this device exists and is active it will be returned
        if (session) {
          return session;
        }
      }
    } else {
      console.log(
        JSON.stringify({
          message: "User is signing in with a new device!",
          userId: targetUser.id,
          userAgent,
          ip,
        })
      );

      const newUserDevice = await this.devicePersistenceService.createDevice({
        userAgent,
        ip,
      });

      if (!newUserDevice) {
        console.warn(
          JSON.stringify({
            message:
              "Couldn't create user device record. Aborting user sign-in operation!",
          })
        );

        return null;
      }

      userDevice = newUserDevice;
    }

    const secret: Secret | null =
      await this.secretPersistenceService.getSecretByUserId(targetUser.id);

    if (!secret) {
      console.warn(
        JSON.stringify({
          message:
            "Warning! Registered user doesn't have a password associated with the account! This should never happen, please investigate current sign-up flow ASAP!",
          userId: targetUser.id,
        })
      );

      return null;
    }

    const isValidPassword: boolean =
      await SecretProcessingService.checkPasswordAgainstHash(
        password,
        secret.passHash,
        secret.salt
      );

    if (!isValidPassword) {
      console.warn(
        JSON.stringify({
          message: "Incorrect credentials provided! Cannot sign-in!",
        })
      );

      return null;
    }

    // TechDebt: The default value for this should be defined by platform config
    const sessionExpiryDate: DateTime = DateTime.now().plus({ hours: 24 });

    session = await this.sessionPersistenceService.createSession({
      deviceId: userDevice.id,
      userId: targetUser.id,
      expiresAt: sessionExpiryDate.toJSDate(),
    });

    if (!session) {
      console.warn(
        JSON.stringify({
          message:
            "Couldn't create new user session record! Aborting sign-in operation!",
        })
      );

      return null;
    }

    return session;
  }

  async terminatePlatformUserSession(sessionId: string): Promise<void> {
    let session: Session | null = null;

    try {
      session = await this.resolveSessionById(sessionId);
    } catch (error) {
      console.warn(error);
      return;
    }

    if (session) {
      const deletedSession = await this.sessionPersistenceService.deleteSession(
        session.id
      );

      // If session persistence operation is performed successfully (i.e. create, read, update, delete), a session instance will be returned
      if (!deletedSession) {
        console.warn(
          JSON.stringify({
            message:
              "Couldn't terminate user session! Please remove the session record manually!",
          })
        );
      }
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
