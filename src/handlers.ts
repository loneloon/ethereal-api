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
      .cookie("Session", userSession.id, {
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
