import { validationResult } from "express-validator";
import { AppError } from "./errors/AppError.js";
import { Request, Response, NextFunction } from "express";

export const validationErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 400, errors.array() as any);
  }
  next();
};
