import {
  PublicApplicationViewDto,
  UserRelatedApplicationViewDto,
} from "../../../aup/dtos/application";
import { AppUserDto } from "../../../aup/dtos/user-projection";
import {
  mapApplicationDomainToPublicApplicationViewDto,
  mapUserProjectionDomainToAppUserDto,
} from "../../../aup/mappers/domain-to-dto";
import { Application } from "../../../aup/models/application";
import { UserProjection } from "../../../aup/models/user-projection";
import { AppPersistenceService } from "../../../aup/services/app-persistence-service";
import { UserProjectionPersistenceService } from "../../../aup/services/user-projection-persistence-service";
import {
  AppUserCannotBeCreatedError,
  AppUserCannotBeDeactivatedError,
  AppUserCannotBeReactivatedError,
  AppUserDoesntExistError,
} from "../../../shared/custom-errors";

export class AppUserController {
  constructor(
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly appPersistenceService: AppPersistenceService
  ) {}

  // AppUser (aka UserProjection in AUP model) refers to a connection between PlatformUser and an Application
  // that can have additional app-specific data attached to it:
  // i.e. alias, settings, roles, etc.
  public async createAppUser(
    appId: string,
    userId: string,
    alias: string
  ): Promise<void> {
    const newAppUser: UserProjection | null =
      await this.userProjectionPersistenceService.createUserProjection({
        userId,
        appId,
        alias,
      });

    if (!newAppUser) {
      throw new AppUserCannotBeCreatedError(appId, userId);
    }
  }

  async editAppUser(sessionId: string) {}

  public async deactivateAppUser(appId: string, userId: string): Promise<void> {
    const deactivatedAppUser: UserProjection | null =
      await this.userProjectionPersistenceService.updateUserProjection(
        appId,
        userId,
        {
          isActive: false,
        }
      );

    if (!deactivatedAppUser) {
      throw new AppUserCannotBeDeactivatedError(appId, userId);
    }
  }

  public async reactivateAppUser(appId: string, userId: string): Promise<void> {
    const reactivatedUser: UserProjection | null =
      await this.userProjectionPersistenceService.updateUserProjection(
        appId,
        userId,
        {
          isActive: true,
        }
      );

    if (!reactivatedUser) {
      throw new AppUserCannotBeReactivatedError(appId, userId);
    }
  }

  public async getAppUser(
    userId: string,
    userEmail: string,
    appId: string,
    appName: string
  ): Promise<AppUserDto> {
    const appUser: UserProjection | null =
      await this.userProjectionPersistenceService.getProjectionByAppAndUserId(
        appId,
        userId
      );

    if (!appUser || !appUser.isActive) {
      throw new AppUserDoesntExistError(appName, userEmail);
    }

    return mapUserProjectionDomainToAppUserDto(appUser);
  }

  public async getUserFollowedApps(
    userId: string
  ): Promise<PublicApplicationViewDto[]> {
    const activeUserProjections: UserProjection[] = (
      await this.userProjectionPersistenceService.getProjectionsByUserId(userId)
    ).filter((projection) => projection.isActive);
    const followedApps: Application[] = (
      await Promise.all(
        activeUserProjections.map(
          async (projection) =>
            await this.appPersistenceService.getApplicationById(
              projection.appId
            )
        )
      )
    ).reduce((result: Application[], curr: Application | null) => {
      if (curr) {
        return [...result, curr];
      }

      return result;
    }, []);

    return followedApps.map((app) =>
      mapApplicationDomainToPublicApplicationViewDto(app)
    );
  }

  // Suggestion: This method can be upgraded by adding a sorting/filtering algorithm
  // based on current user's settings (i.e remove apps that they marked as unrelated or move them to the end of the list, etc.),
  // basically providing a filtered selection of apps tailored specifically for this user
  public async getAppsForUser(
    userId: string
  ): Promise<UserRelatedApplicationViewDto[]> {
    const allApps: Application[] =
      await this.appPersistenceService.getAllApplications();
    const allAppsWithUserFollowingFlag: UserRelatedApplicationViewDto[] =
      await Promise.all(
        allApps.map(async (app) => {
          const userProjection: UserProjection | null =
            await this.userProjectionPersistenceService.getProjectionByAppAndUserId(
              app.id,
              userId
            );

          return {
            ...mapApplicationDomainToPublicApplicationViewDto(app),
            isFollowing: userProjection ? true : false,
          };
        })
      );

    return allAppsWithUserFollowingFlag;
  }
}
