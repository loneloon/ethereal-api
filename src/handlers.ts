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
    context.res
      .cookie("SESS_ID", userSession.id, {
        expires: userSession.expiresAt.toJSDate(),
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
  const rawCookie = context.req.headers.cookie;

  if (!rawCookie) {
    context.res.status(403).json({
      message: "User is not signed in!",
    });
    return;
  }

  const parsedCookie = rawCookie.split("=");

  if (parsedCookie.length > 2) {
    context.res.status(400).json({
      message: "Bad headers! Received malformed cookie!",
    });
    return;
  }

  const sessionId = parsedCookie[1];

  try {
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
