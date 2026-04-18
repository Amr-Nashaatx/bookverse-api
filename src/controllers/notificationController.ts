import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { sseManager } from "../services/SSE/SSEManager.js";
import { notificationService } from "../services/notificationService.js";
import { APIResponse } from "../utils/response.js";
import { toMongoId } from "../utils/utils.js";

export const stream = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id!;

  sseManager.addClient(userId, res);
  req.on("close", () => sseManager.removeClient(userId)); // remove client on Disconnect

  // force disconnect after 2 hours to prevent stale connections
  const forceClose = setTimeout(
    () => {
      sseManager.removeClient(userId);
      res.end();
    },
    2 * 60 * 60 * 1000,
  );

  req.on("close", () => clearTimeout(forceClose));
});

export const fetchUnread = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!?._id;
  const notifications = await notificationService.getUnread(userId);

  const response = new APIResponse("success");
  response.addResponseData("notifications", notifications);
  res.send(response);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!?._id;
  const notId = req.params.id as string;
  await notificationService.markRead(toMongoId(notId), userId);

  res.status(204).send();
});
