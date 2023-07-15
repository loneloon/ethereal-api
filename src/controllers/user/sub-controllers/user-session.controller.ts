import { DateTime } from "luxon";
import { Session } from "../../../ssd/models/session";
import { SessionPersistenceService } from "../../../ssd/services/session-persistence-service";
import { SecretProcessingService } from "../../../ssd/services/secret-processing-service";
import {
  ExpiredUserSessionCannotBeDeletedError,
  UserIsNotAuthenticatedError,
  UserSessionCannotBeCreatedError,
  UserSessionCannotBeDeletedError,
  UserSessionHasExpiredError,
} from "../../../shared/custom-errors";
import {
  SessionCookieDto,
  SessionStatus,
} from "../../../ssd/dtos/authentication";

export class UserSessionController {
  constructor(
    readonly sessionPersistenceService: SessionPersistenceService,
    readonly secretProcessingService: SecretProcessingService
  ) {}

  // TODO: Get all active sessions for user

  public async resolveSessionById(sessionId: string): Promise<Session> {
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

  public async createPlatformUserSession(
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

  async getPlatformUserSessionStatus(
    sessionId: string
  ): Promise<SessionStatus> {
    let session: Session | null = null;
    try {
      session = await this.resolveSessionById(sessionId);
    } catch (error: any) {
      console.warn(error.dto);
    }

    return {
      isSessionAlive: session ? true : false,
    };
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

  async issueSessionCookie(sessionId: string): Promise<SessionCookieDto> {
    const session: Session = await this.resolveSessionById(sessionId);

    return this.secretProcessingService.generateSessionCookie(
      session.id,
      session.expiresAt
    );
  }

  public async deleteAllUserSessions(userId: string): Promise<void> {
    const allUserSessions: Session[] =
      await this.sessionPersistenceService.getSessionsByUserId(userId);
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
  }
}
