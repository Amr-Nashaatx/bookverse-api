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
  body("socialLinks")
    .optional()
    .isObject()
    .withMessage("socialLinks must be an object"),
  body("socialLinks.website")
    .optional()
    .if(body("socialLinks.website").notEmpty())
    .isURL()
    .withMessage("website must be a valid URL"),
  body("socialLinks.x")
    .optional()
    .if(body("socialLinks.x").notEmpty())
    .isURL()
    .withMessage("x must be a valid URL"),
  body("socialLinks.instagram")
    .optional()
    .if(body("socialLinks.instagram").notEmpty())
    .isURL()
    .withMessage("instagram must be a valid URL"),
  body("socialLinks.linkedIn")
    .optional()
    .if(body("socialLinks.linkedIn").notEmpty())
    .isURL()
    .withMessage("linkedIn must be a valid URL"),
  body("socialLinks.facebook")
    .optional()
    .if(body("socialLinks.facebook").notEmpty())
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
  body("socialLinks")
    .optional()
    .isObject()
    .withMessage("socialLinks must be an object"),
  body("socialLinks.website")
    .optional()
    .if(body("socialLinks.website").notEmpty())
    .isURL()
    .withMessage("website must be a valid URL"),
  body("socialLinks.x")
    .optional()
    .if(body("socialLinks.x").notEmpty())
    .isURL()
    .withMessage("x must be a valid URL"),
  body("socialLinks.instagram")
    .optional()
    .if(body("socialLinks.instagram").notEmpty())
    .isURL()
    .withMessage("instagram must be a valid URL"),
  body("socialLinks.linkedIn")
    .optional()
    .if(body("socialLinks.linkedIn").notEmpty())
    .isURL()
    .withMessage("linkedIn must be a valid URL"),
  body("socialLinks.facebook")
    .optional()
    .if(body("socialLinks.facebook").notEmpty())
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
