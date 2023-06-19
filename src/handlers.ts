import { Request, Response } from "express";
import { UserManagementController } from "./controllers/user-management-controller";
import { UserIsNotAuthenticatedError } from "./shared/custom-errors/categories/users/authentication";
import { AppManagementController } from "./controllers/app-management-controller";
import { MissingArgumentsError } from "./shared/custom-errors/categories/common/validation";

export const signUpUser = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    if (!body.email || !body.password) {
      throw new MissingArgumentsError(["email", "password"]);
    }

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
    if (!body.email || !body.password) {
      throw new MissingArgumentsError(["email", "password"]);
    }

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
    if (!body.email) {
      throw new MissingArgumentsError(["email"]);
    }

    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.updatePlatformUserEmail(
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
    if (!body.oldPassword || !body.newPassword) {
      throw new MissingArgumentsError(["oldPassword", "newPassword"]);
    }

    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.updatePlatformUserSecret(
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
    if (!body.username) {
      throw new MissingArgumentsError(["username"]);
    }

    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.updatePlatformUserUsername(
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
    if (!body.firstName || !body.lastName) {
      throw new MissingArgumentsError(["firstName", "lastName"]);
    }

    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.updatePlatformUserName(
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
    if (!body.name || !body.email || !body.url) {
      throw new MissingArgumentsError(["name", "email", "url"]);
    }

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
    if (!body.name || !body.email || !body.backupCode) {
      throw new MissingArgumentsError(["name", "email", "backupCode"]);
    }

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

export const updateAppName = async (
  context: { req: Request; res: Response },
  appManagementController: AppManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    if (!body.accessKeyId || !body.secretAccessKey || !body.name) {
      throw new MissingArgumentsError([
        "accessKeyId",
        "secretAccessKey",
        "name",
      ]);
    }

    await appManagementController.updateAppName(
      body.accessKeyId,
      body.secretAccessKey,
      body.name
    );

    context.res
      .status(200)
      .json({ message: "Application name was successfully updated!" });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const updateAppEmail = async (
  context: { req: Request; res: Response },
  appManagementController: AppManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    if (!body.accessKeyId || !body.secretAccessKey || !body.email) {
      throw new MissingArgumentsError([
        "accessKeyId",
        "secretAccessKey",
        "email",
      ]);
    }

    await appManagementController.updateAppEmail(
      body.accessKeyId,
      body.secretAccessKey,
      body.email
    );

    context.res
      .status(200)
      .json({ message: "Application contact email was successfully updated!" });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const updateAppUrl = async (
  context: { req: Request; res: Response },
  appManagementController: AppManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    if (!body.accessKeyId || !body.secretAccessKey || !body.url) {
      throw new MissingArgumentsError([
        "accessKeyId",
        "secretAccessKey",
        "url",
      ]);
    }

    await appManagementController.updateAppUrl(
      body.accessKeyId,
      body.secretAccessKey,
      body.url
    );

    context.res
      .status(200)
      .json({ message: "Application url was successfully updated!" });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const getApp = async (
  context: { req: Request; res: Response },
  appManagementController: AppManagementController
): Promise<void> => {
  const params = context.req.query as any;

  try {
    if (!params.accessKeyId || !params.secretAccessKey) {
      throw new MissingArgumentsError(["accessKeyId", "secretAccessKey"]);
    }

    const appDto = await appManagementController.getApp(
      params.accessKeyId,
      params.secretAccessKey
    );

    context.res.status(200).json(appDto);
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const getAppUsers = async (
  context: { req: Request; res: Response },
  appManagementController: AppManagementController
): Promise<void> => {
  const params = context.req.query as any;

  try {
    if (!params.accessKeyId || !params.secretAccessKey) {
      throw new MissingArgumentsError(["accessKeyId", "secretAccessKey"]);
    }

    const appUsers = await appManagementController.getAppUsers(
      params.accessKeyId,
      params.secretAccessKey
    );

    context.res.status(200).json({ users: appUsers });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const followApp = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    if (!body.appName || !body.alias) {
      throw new MissingArgumentsError(["appName", "alias"]);
    }

    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.followApp(
      sessionId,
      body.appName,
      body.alias
    );
    context.res
      .status(200)
      .json({ message: `User is now following the '${body.appName}' app!` });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const unfollowApp = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const body = context.req.body;

  try {
    if (!body.appName || !body.alias) {
      throw new MissingArgumentsError(["appName", "alias"]);
    }

    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    await userManagementController.unfollowApp(sessionId, body.appName);
    context.res
      .status(200)
      .json({ message: `User has unfollowed the '${body.appName}' app!` });
    return;
  } catch (error: any) {
    context.res.status(error.httpCode).json(error.dto);
    return;
  }
};

export const getAppUser = async (
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<void> => {
  const params = context.req.query as any;

  try {
    if (!params.appName) {
      throw new MissingArgumentsError(["appName"]);
    }

    const sessionId = (
      await resolveAuthContext(context, userManagementController)
    ).sessionId;

    const appUserDto = await userManagementController.getAppUser(
      sessionId,
      params.appName
    );
    context.res.status(200).json(appUserDto);
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
