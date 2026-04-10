import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { APIResponse } from "../utils/response.js";
import { getSingleValueFromParams } from "../utils/utils.js";
import { AppError } from "../utils/errors/AppError.js";
import * as previewShareService from "../services/previewShareService.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const bookId = getSingleValueFromParams(req.params.bookId);

  if (!bookId) throw new AppError("Book id is invalid", 400);

  let durationMs: number | undefined;
  if (req.query.durationMs && typeof req.query.durationMs === "string") {
    durationMs = parseInt(req.query.durationMs);
  }

  let userId: string | undefined;
  if (req.query.sharedWith && typeof req.query.sharedWith === "string") {
    userId = req.query.sharedWith;
  } else throw new AppError("invalid user id", 400);

  const previewShare = await previewShareService.createPreviewShare(
    bookId,
    userId,
    req.user!,
    durationMs,
  );

  const response = new APIResponse("success", "Preview share created");
  response.addResponseData("previewShare", previewShare);
  res.status(201).json(response);
});

export const findById = asyncHandler(async (req: Request, res: Response) => {
  const shareId = getSingleValueFromParams(req.params.shareId);
  if (!shareId) throw new AppError("Invalid share id", 400);

  const previewShare = await previewShareService.getPreviewShare(
    shareId,
    req.user!,
  );
  const response = new APIResponse("success", "previewShare fetched");
  response.addResponseData("previewShare", previewShare);
  res.json(response);
});

export const deleteById = asyncHandler(async (req: Request, res: Response) => {
  const shareId = getSingleValueFromParams(req.params.shareId);
  if (!shareId) throw new AppError("Invalid share id", 400);

  const previewShare = await previewShareService.deletePreviewShare(
    shareId,
    req.user!,
  );
  const response = new APIResponse("success", "Preview share deleted");
  response.addResponseData("previewShare", previewShare);
  res.json(response);
});
