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
    let targetUser: User | null = null;

    try {
      targetUser = await this.resolvePlatformUserBySessionId(sessionId);
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: "Cannot perform user update operation!",
          error,
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
    let targetUser: User | null = null;

    try {
      targetUser = await this.resolvePlatformUserBySessionId(sessionId);
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: "Cannot perform user deactivation operation!",
          error,
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

  private async resolvePlatformUserBySessionId(
    sessionId: string
  ): Promise<User> {
    const session: Session | null =
      await this.sessionPersistenceService.getSessionById(sessionId);

    if (!session) {
      throw new Error(
        JSON.stringify({
          message:
            "Cannot resolve platform user, provided session id doesn't exist!",
          sessionId,
        })
      );
    }

    if (session && !session.isActive) {
      throw new Error(
        JSON.stringify({
          message:
            "Cannot resolve platform user, provided session id refers to expired session!",
          sessionId,
        })
      );
    }

    const user: User | null = await this.userPersistenceService.getUserById(
      session.userId
    );

    if (!user) {
      // This can happen if a user record was hard deleted but related sessions were not terminated/deleted before/after that
      throw new Error(
        JSON.stringify({
          message:
            "Warning! There is an active session record that is linked to a user that doesn't exist anymore. Cannot resolve platform user!",
          sessionId: session.id,
          userId: session.userId,
        })
      );
    }

    return user;
  }

  async signInPlatformUser(
    email: string,
    password: string,
    userAgent: string,
    ip: string
  ): Promise<Session | null> {
    // TODO
    return;
  }

  // AppUser (aka UserProjection in AUP model) refers to a connection between PlatformUser and an Application
  // that can have additional app-specific data attached to it:
  // i.e. alias, settings, roles, etc.
  async createAppUser(sessionId: string) {}

  async editAppUser(sessionId: string) {}

  async deactivateAppUser(sessionId: string) {}
}
