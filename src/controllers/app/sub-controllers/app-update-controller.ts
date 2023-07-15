import { Application } from "../../../aup/models/application";
import { AppPersistenceService } from "../../../aup/services/app-persistence-service";
import { AppNameCannotBeUpdatedError } from "../../../shared/custom-errors";
import { validateEmailString } from "../../../shared/validators";

export class AppUpdateController {
  constructor(readonly appPersistenceService: AppPersistenceService) {}

  public async updateAppName(appId: string, name: string): Promise<void> {
    const updatedApp: Application | null =
      await this.appPersistenceService.updateApplication(appId, {
        name,
      });

    if (!updatedApp) {
      throw new AppNameCannotBeUpdatedError(appId);
    }
  }

  public async updateAppUrl(appId: string, url: string): Promise<void> {
    // TODO: Url string validator

    const updatedApp: Application | null =
      await this.appPersistenceService.updateApplication(appId, {
        url,
      });

    if (!updatedApp) {
      throw new AppNameCannotBeUpdatedError(appId);
    }
  }

  public async updateAppEmail(appId: string, email: string): Promise<void> {
    validateEmailString(email);

    const updatedApp: Application | null =
      await this.appPersistenceService.updateApplication(appId, {
        email,
      });

    if (!updatedApp) {
      throw new AppNameCannotBeUpdatedError(appId);
    }
  }

  public async deactivateApp(appId: string): Promise<void> {
    const deactivatedApp: Application | null =
      await this.appPersistenceService.updateApplication(appId, {
        isActive: false,
      });

    if (!deactivatedApp) {
      throw new AppNameCannotBeUpdatedError(appId);
    }
  }
}
