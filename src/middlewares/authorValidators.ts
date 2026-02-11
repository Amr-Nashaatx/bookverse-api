import { body, validationResult } from "express-validator";
import { AppError } from "../utils/errors/AppError.js";
import { Request, Response, NextFunction } from "express";

export const validateCreateAuthor = [
  body("penName")
    .isString()
    .withMessage("PenName cannot be numbers")
    .notEmpty()
    .withMessage("PenName cannot be empty")
    .toLowerCase()
    .isLength({ min: 2, max: 100 })
    .withMessage("PenName must be between 2 to 100 characters long"),
  body("bio").isString().isLength({ max: 500 }).optional(),
  body("avatar").isURL().optional(),
  body("socialLinks")
    .optional()
    .isObject()
    .withMessage("socialLinks must be an object"),
  body("socialLinks.website")
    .optional()
    .isURL()
    .withMessage("website must be a valid URL"),
  body("socialLinks.x").optional().isURL().withMessage("x must be a valid URL"),
  body("socialLinks.instagram")
    .optional()
    .isURL()
    .withMessage("instagram must be a valid URL"),
  body("socialLinks.linkedIn")
    .optional()
    .isURL()
    .withMessage("linkedIn must be a valid URL"),
  body("socialLinks.facebook")
    .optional()
    .isURL()
    .withMessage("facebook must be a valid URL"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array() as any);
    }
    next();
  },
];

export const validateUpdateAuthor = [
  body("penName")
    .optional()
    .isString()
    .withMessage("PenName cannot be numbers")
    .notEmpty()
    .withMessage("PenName cannot be empty")
    .toLowerCase()
    .isLength({ min: 2, max: 100 })
    .withMessage("PenName must be between 2 to 100 characters long"),
  body("bio").optional().isString().isLength({ max: 500 }),
  body("avatar").optional().isURL(),
  body("socialLinks")
    .optional()
    .isObject()
    .withMessage("socialLinks must be an object"),
  body("socialLinks.website")
    .optional()
    .isURL()
    .withMessage("website must be a valid URL"),
  body("socialLinks.x").optional().isURL().withMessage("x must be a valid URL"),
  body("socialLinks.instagram")
    .optional()
    .isURL()
    .withMessage("instagram must be a valid URL"),
  body("socialLinks.linkedIn")
    .optional()
    .isURL()
    .withMessage("linkedIn must be a valid URL"),
  body("socialLinks.facebook")
    .optional()
    .isURL()
    .withMessage("facebook must be a valid URL"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, errors.array() as any);
    }
    next();
  },
];
