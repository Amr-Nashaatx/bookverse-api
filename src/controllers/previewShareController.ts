import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { APIResponse } from "../utils/response.js";
import { getSingleValueFromParams } from "../utils/utils.js";
import { AppError } from "../utils/errors/AppError.js";
import * as previewShareService from "../services/previewShareService.js";
import { getBookById } from "../services/bookService.js";
import { generateBookPreview } from "../services/previewService.js";
import { findChaptersOfBook } from "../services/chapterService.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const bookId = getSingleValueFromParams(req.params.bookId);

  if (!bookId) throw new AppError("Book id is invalid", 400);

  const { durationMs, email } = req.body as {
    durationMs: number;
    email: string;
  };

  const previewShare = await previewShareService.createPreviewShare(
    bookId,
    email,
    req.user!,
    durationMs,
  );

  const response = new APIResponse("success", "Preview share created");
  response.addResponseData("previewShare", previewShare);
  res.status(201).json(response);
});

export const previewByShareId = asyncHandler(
  async (req: Request, res: Response) => {
    const shareId = getSingleValueFromParams(req.params.shareId);
    if (!shareId) throw new AppError("Invalid share id", 400);

    const userId = req.user!._id;
    const previewShare = await previewShareService.getPreviewShare(
      shareId,
      req.user!,
    );

    // check the userId is the same as the sharedWith user on previewShare object
    if (!previewShare.userId.equals(userId)) {
      throw new AppError("user does not have access for this link", 403);
    }

    const book = await getBookById(previewShare.bookId.toString());
    const chapters = await findChaptersOfBook(book._id.toString(), req.user!);
    const pdf = await generateBookPreview(book, chapters);

    res.setHeader("Content-Type", "application/pdf");
    // inline means open in browser tab rather than force download
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${book.title}.pdf"`,
    );
    res.send(pdf);
  },
);

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
