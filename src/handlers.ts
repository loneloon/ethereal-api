import { Request, Response } from "express";
import { UserManagementController } from "./controllers/user-management-controller";

export const registerUser = async (
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
    context.res.status(400).json(JSON.parse(error.message));
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
      .json({ message: "Authentication successful!" });
    return;
  } catch (error: any) {
    context.res.status(403).json(JSON.parse(error.message));
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
    context.res.status(400).json(JSON.parse(error.message));
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
    context.res.status(400).json(JSON.parse(error.message));
    return;
  }
};

async function resolveAuthContext(
  context: { req: Request; res: Response },
  userManagementController: UserManagementController
): Promise<{ sessionId: string }> {
  const rawCookie = context.req.headers.cookie;

  if (!rawCookie) {
    throw new Error(
      JSON.stringify({
        message: "User is not signed in!",
      })
    );
  }

  try {
    return {
      sessionId:
        userManagementController.secretProcessingService.parseSessionCookie(
          rawCookie
        ),
    };
  } catch (error: any) {
    throw new Error(JSON.parse(error.message));
  }
}
