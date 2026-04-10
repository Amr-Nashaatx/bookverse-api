import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { APIResponse } from "../utils/response.js";
import {
  createChapter,
  deleteChapter,
  getChapterById,
  listChapters,
  reorderChapters,
  updateChapter,
} from "../services/chapterService.js";
import { getSingleValueFromParams } from "../utils/utils.js";
import { AppError } from "../utils/errors/AppError.js";

export const createChapterController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.bookId);
    if (!bookId) throw new AppError("id not provided", 400);
    const chapter = await createChapter(bookId, req.user, req.body);
    const response = new APIResponse("success", "Chapter created successfully");
    response.addResponseData("chapter", {
      _id: chapter._id,
      bookId: chapter.bookId,
      title: chapter.title,
      wordCount: chapter.wordCount,
      status: chapter.status,
      createdAt: chapter.createdAt,
    });
    res.status(201).json(response);
  },
);

export const listChaptersController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.bookId);
    if (!bookId) throw new AppError("id not provided", 400);

    const chapters = await listChapters(
      bookId,
      req.user,
      req.query.status as "draft" | "published" | undefined,
    );
    const response = new APIResponse(
      "success",
      "Chapters fetched successfully",
    );
    response.addResponseData("chapters", chapters);
    res.status(200).json(response);
  },
);

export const getChapterController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.bookId);
    if (!bookId) throw new AppError("Book id not provided", 400);

    const chapterId = getSingleValueFromParams(req.params.chapterId);
    if (!chapterId) throw new AppError("Chapter id not provided", 400);

    const chapter = await getChapterById(bookId, chapterId, req.user);
    const response = new APIResponse("success", "Chapter fetched successfully");
    response.addResponseData("chapter", chapter);
    res.status(200).json(response);
  },
);

export const updateChapterController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.bookId);
    if (!bookId) throw new AppError("Book id not provided", 400);

    const chapterId = getSingleValueFromParams(req.params.chapterId);
    if (!chapterId) throw new AppError("Chapter id not provided", 400);

    const chapter = await updateChapter(bookId, chapterId, req.user, req.body);
    const response = new APIResponse("success", "Chapter updated successfully");
    response.addResponseData("chapter", chapter);
    res.status(200).json(response);
  },
);

export const deleteChapterController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.bookId);
    if (!bookId) throw new AppError("Book id not provided", 400);

    const chapterId = getSingleValueFromParams(req.params.chapterId);
    if (!chapterId) throw new AppError("Chapter id not provided", 400);

    await deleteChapter(bookId, chapterId, req.user);
    const response = new APIResponse("success", "Chapter deleted successfully");
    response.addResponseData("success", true);
    res.status(200).json(response);
  },
);

export const reorderChaptersController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.bookId);
    if (!bookId) throw new AppError("Book id not provided", 400);

    const chapters = await reorderChapters(bookId, req.user, req.body.chapters);
    const response = new APIResponse(
      "success",
      "Chapters reordered successfully",
    );
    response.addResponseData("chapters", chapters);
    res.status(200).json(response);
  },
);
