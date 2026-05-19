import { body, param, query } from "express-validator";
import { validationErrorHandler } from "../utils/validatorErrorHandler.js";

export const validateApproveAuthor = [param("id").isMongoId(), validationErrorHandler];

export const validateRejectAuthor = [
    param("id").isMongoId(),
    body("rejectionReason").optional().isString(),
    validationErrorHandler,
];

export const validateListAuthors = [
    query("name").optional().isString(),
    query("status").optional().isString(),
    query("page").optional().isString().isNumeric(),
];

export const validateModerateBookRequest = [
    param("id").isMongoId(),
    body("rejectionReason").optional().isString(),
    validationErrorHandler,
];

export const validateListBooks = [];
