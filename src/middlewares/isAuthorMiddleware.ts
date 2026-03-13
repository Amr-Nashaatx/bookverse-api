import { AppError } from "../utils/errors/AppError.js";
import { asyncHandler } from "./asyncHandler.js";
import { Request, Response, NextFunction } from "express";

export const isAuthor = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== "author")
      throw new AppError("User must be an author", 403);
    next();
  },
);

export const isAuthorOrAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role == "author" || req.user?.role == "admin") next();
    else throw new AppError("User must be an author", 403);
  },
);
