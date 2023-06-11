import { UserProjection as UserProjectionDto } from "@prisma-dual-cli/generated/aup-client";

export type AppUserDto = Omit<
  UserProjectionDto,
  "appId" | "userId" | "appData" | "isActive"
> & { appData: { [key: string]: string | number } };
