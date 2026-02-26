import { AppError } from "../utils/errors/AppError.js";
import { asyncHandler } from "./asyncHandler.js";
import { Request, Response, NextFunction } from "express";

export const isAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin")
      throw new AppError("User must be an admin", 403);
    next();
  },
);
