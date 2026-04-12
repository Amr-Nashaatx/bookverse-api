import { body, validationResult } from "express-validator";
import { AppError } from "../utils/errors/AppError.js";
import { Request, Response, NextFunction } from "express";

const handleValidationErrors = (
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

export const previewShareCreateValidator = [
  body("email").isEmail(),
  body("duration").isNumeric(),
  handleValidationErrors,
];
