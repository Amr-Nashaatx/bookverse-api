import { body, param, query, validationResult } from "express-validator";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors/AppError.js";

const handleValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 400, errors.array() as any);
  }
  next();
};

const validateBookIdParam = param("bookId")
  .isMongoId()
  .withMessage("Invalid bookId");
const validateChapterIdParam = param("chapterId")
  .isMongoId()
  .withMessage("Invalid chapterId");

export const validateCreateChapter = [
  validateBookIdParam,
  body("title")
    .isString()
    .withMessage("title must be a string")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("title must be between 1 and 200 characters"),
  body("content")
    .optional()
    .isString()
    .withMessage("content must be a string")
    .trim()
    .isLength({ min: 100 })
    .withMessage("content must be at least 100 characters"),
  handleValidation,
];

export const validateListChapters = [
  validateBookIdParam,
  query("status")
    .optional()
    .isIn(["draft", "published"])
    .withMessage("status must be either draft or published"),
  handleValidation,
];

export const validateGetChapter = [
  validateBookIdParam,
  validateChapterIdParam,
  handleValidation,
];

export const validateUpdateChapter = [
  validateBookIdParam,
  validateChapterIdParam,
  body("title")
    .optional()
    .isString()
    .withMessage("title must be a string")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("title must be between 1 and 200 characters"),
  body("content").optional().isJSON().withMessage("content must json string"),
  body("wordCount").optional().isInt(),
  body().custom((value) => {
    if (
      !value ||
      (typeof value === "object" &&
        !("title" in value) &&
        !("content" in value))
    ) {
      throw new Error("At least one of title or content must be provided");
    }
    return true;
  }),
  handleValidation,
];

export const validateDeleteChapter = [
  validateBookIdParam,
  validateChapterIdParam,
  handleValidation,
];

export const validateReorderChapters = [
  validateBookIdParam,
  body("chapters")
    .isArray({ min: 1 })
    .withMessage("chapters must be a non-empty array"),
  body("chapters.*")
    .isMongoId()
    .withMessage("each chapter id must be a valid Mongo id"),
  handleValidation,
];
