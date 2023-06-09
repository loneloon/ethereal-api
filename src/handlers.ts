import { Request, Response } from "express";
import { UserManagementController } from "./controllers/user-management-controller";
import { UserIsNotAuthenticatedError } from "./shared/custom-errors/categories/users/authentication";
import { AppManagementController } from "./controllers/app-management-controller";

export const signUpUser = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    await userManagementController.createPlatformUser(
      body.email,
      body.password
    );
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }

  context.res.status(200).json({
    message: "User registration successful!",
  });
  return;
};

export const signInUser = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;
  const userAgent = context.req.headers["user-agent"] ?? "";
  const ip = context.req.ip;

  try {
    const userSession = await userManagementController.signInPlatformUser(
      body.email,
      body.password,
      userAgent,
      ip
    );

    const sessionCookie =
      userManagementController.secretProcessingService.generateSessionCookie(
        userSession.id,
        userSession.expiresAt
      );

    context.res
      .cookie(sessionCookie.name, sessionCookie.data, {
        expires: sessionCookie.expiresAt,
        httpOnly: true,
        domain: sessionCookie.domain,
      })
      .status(200)
      .json({ message: "User authentication successful!" });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const signOutUser = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  try {
    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.terminatePlatformUserSession(sessionId);
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }

  context.res.status(200).json({
    message: "Session terminated successfully!",
  });
  return;
};

export const getUser = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  try {
    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    const userDto = await userManagementController.getPlatformUser(sessionId);
    context.res.status(200).json(userDto);
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const updateUserEmail = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.changePlatformUserEmail(
      sessionId,
      body.email
    );
    context.res.status(200).json({
      message:
        "User's email address was successfully updated! Please verify it through the email we've sent to your mailbox!",
    });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const updateUserPassword = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.changePlatformUserPassword(
      sessionId,
      body.oldPassword,
      body.newPassword
    );
    context.res
      .status(200)
      .json({ message: "User's password was successfully updated!" });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const updateUserUsername = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.changePlatformUserUsername(
      sessionId,
      body.username
    );
    context.res
      .status(200)
      .json({ message: "User's username was successfully updated!" });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const updateUserName = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.changePlatformUserName(
      sessionId,
      body.firstName,
      body.lastName
    );
    context.res
      .status(200)
      .json({ message: "User's name was successfully updated!" });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const registerApp = async (
  context: { req: Request; res: Response },
  appManagementController: AppManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    const appKeys = await appManagementController.registerApp(
      body.name,
      body.email,
      body.url
    );

    context.res.status(200).json({
      message:
        "Application registration successful! In order to access app controls please use the provided access key. Backup code will be required to reset the access key.",
      appKeys,
    });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const resetAppKeys = async (
  context: { req: Request; res: Response },
  appManagementController: AppManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    const appKeys = await appManagementController.resetAccessKeys(
      body.name,
      body.email,
      body.backupCode
    );

    context.res.status(200).json({
      message:
        "Application keys were successfully reset! Please use the new access key to manage your app. Old backup code is invalidated! Please use the new backup code if access key reset is needed!",
      appKeys,
    });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const getAllApps = async (
  context: { req: Request; res: Response },
  appManagementController: AppManagementController
): Promise<void> => {
  try {
    const publicAppViewDtos = await appManagementController.getAllPublicApps();

    context.res.status(200).json({ apps: publicAppViewDtos });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

async function resolveAuthContext(
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<{ sessionId: string }> {
  const rawCookie = context.req.headers.cookie;

  if (!rawCookie) {
    throw new UserIsNotAuthenticatedError();
  }

  return {
    sessionId:
      userManagementController.secretProcessingService.parseSessionCookie(
        rawCookie
      ),
  };
}
