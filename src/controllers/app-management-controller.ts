import { AppPersistenceService } from "../aup/services/app-persistence-service";
import { UserProjectionPersistenceService } from "../aup/services/user-projection-persistence-service";
import { SessionPersistenceService } from "../ssd/services/session-persistence-service";

export class AppManagementController {
  constructor(
    readonly appPersistenceService: AppPersistenceService,
    readonly userProjectionPersistenceService: UserProjectionPersistenceService,
    readonly sessionPersistenceService: SessionPersistenceService
  ) {}
}
