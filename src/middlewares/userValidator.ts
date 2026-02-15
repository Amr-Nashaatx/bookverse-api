import { body, validationResult } from "express-validator";
import { AppError } from "../utils/errors/AppError.js";
import { Request, Response, NextFunction } from "express";

export const validateUpdateUser = [
  body("name")
    .optional()
    .isString()
    .withMessage("Name cannot be numbers")
    .notEmpty()
    .withMessage("Name cannot be empty")
    .toLowerCase()
    .isLength({ min: 3, max: 10 })
    .withMessage("Name must be between 3 to 10 characters long"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array() as any);
    }
    next();
  },
];
