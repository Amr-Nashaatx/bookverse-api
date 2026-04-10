import { PreviewShareModel } from "../models/PreviewShare.js";
import * as bookService from "../services/bookService.js";
import * as userService from "../services/usersService.js";
import { AppError } from "../utils/errors/AppError.js";
import type { IUser } from "../models/userModel.js";

const isShareOwnerOrAdmin = (previewShare: any, user: IUser) => {
  if (user.role === "admin") return true;
  return previewShare.sharedBy?.toString() === user._id.toString();
};

const canReadShare = (previewShare: any, user: IUser) => {
  if (isShareOwnerOrAdmin(previewShare, user)) return true;
  return previewShare.userId?.toString() === user._id.toString();
};

export const createPreviewShare = async (
  bookId: string,
  userId: string,
  sharedBy: IUser,
  durationMs?: number,
) => {
  if (
    durationMs !== undefined &&
    (!Number.isFinite(durationMs) || durationMs <= 0)
  ) {
    throw new AppError("Duration must be a positive number", 400);
  }

  // book existence, ownership, and shareable status
  const book = await bookService.getBookById(bookId);
  if (!book) throw new AppError("Invalid book id", 400);

  const isOwner =
    sharedBy.role === "admin" ||
    book.authorId?.toString() === sharedBy.authorId?.toString();
  if (!isOwner) throw new AppError("Unauthorized", 401);
  if (book.status !== "preview") {
    throw new AppError("Book must be in preview status to share", 400);
  }
  if (sharedBy._id.toString() === userId) {
    throw new AppError("Cannot share a preview with yourself", 400);
  }

  // check existence of the user to share the book with
  const userExists = !!(await userService.findById(userId));
  if (!userExists) throw new AppError("User id is not valid", 400);

  const existingShare = await PreviewShareModel.findOne({ bookId, userId });
  if (existingShare) throw new AppError("Preview share already exists", 400);

  const previewShare = await PreviewShareModel.create({
    userId,
    sharedBy: sharedBy._id,
    bookId,
    expiresAt: durationMs ? new Date(Date.now() + durationMs) : null,
  });
  return previewShare;
};

export const getPreviewShare = async (shareId: string, user: IUser) => {
  const previewShare = await PreviewShareModel.findById(shareId).lean();
  if (!previewShare) throw new AppError("Preview share not found", 404);
  if (!canReadShare(previewShare, user)) throw new AppError("Unauthorized", 401);
  return previewShare;
};

export const deletePreviewShare = async (shareId: string, user: IUser) => {
  const previewShare = await PreviewShareModel.findById(shareId).lean();
  if (!previewShare) throw new AppError("Preview share not found", 404);
  if (!isShareOwnerOrAdmin(previewShare, user))
    throw new AppError("Unauthorized", 401);

  const deletedShare = await PreviewShareModel.findByIdAndDelete(shareId).lean();

  return deletedShare;
};
