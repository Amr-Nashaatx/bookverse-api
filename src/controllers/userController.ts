import { asyncHandler } from "../middlewares/asyncHandler.js";
import { Request, Response } from "express";
import * as usersService from "../services/usersService.js";
import { APIResponse } from "../utils/response.js";
import { getSingleValueFromParams } from "../utils/utils.js";

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    data: {
      user: req.user,
    },
  });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = getSingleValueFromParams(req.params.id)!;
  const updates = req.body;
  const updatedUser = await usersService.updateUser(userId, updates);
  const apiRes = new APIResponse("success", "User updated");
  apiRes.addResponseData("user", updatedUser);
  return res.send(apiRes);
});

export const uploadAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    const file = req.file!;
    const userId = req.user?._id!;
    const user = await usersService.uploadAvatar(
      userId.toString(),
      file.buffer,
    );
    const apiRes = new APIResponse("success", "Uploaded avatar");
    return res.send(apiRes);
  },
);
