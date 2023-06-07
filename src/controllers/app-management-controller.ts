import { AppPersistenceService } from "../aup/services/app-persistence-service";
import { UserProjectionPersistenceService } from "../aup/services/user-projection-persistence-service";
import { SessionPersistenceService } from "../ssd/services/session-persistence-service";
import { SecretPersistenceService } from "../ssd/services/secret-persistence-service";
import { SecretProcessingService } from "../ssd/services/secret-processing-service";

export class AppManagementController {
  constructor(
    readonly appPersistenceService: AppPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly sessionPersistenceService: SessionPersistenceService,
    readonly secretPersistenceService: SecretPersistenceService,
    readonly secretProcessingService: SecretProcessingService
  ) {}

  private async createAppSecret() {}

  private async verifyAppSecret() {}

  public async registerApp() {}

  public async updateApp() {}

  public async getAppUsers() {}
}
