import { asyncHandler } from "../middlewares/asyncHandler.js";
import { Request, Response, NextFunction } from "express";
import * as usersService from "../services/usersService.js";
import { APIResponse } from "../utils/response.js";

export const me = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    res.json({
      data: {
        user: req.user,
      },
    });
  },
);

export const updateUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;
    const updates = req.body;
    const updatedUser = await usersService.updateUser(userId, updates);
    const apiRes = new APIResponse("success", "User updated");
    apiRes.addResponseData("user", updatedUser);
    return res.send(apiRes);
  },
);
