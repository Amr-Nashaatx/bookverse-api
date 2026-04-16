import mongoose from "mongoose";
import { BookModel } from "../models/bookModel.js";
import { ChapterModel, IChapter } from "../models/chapterModel.js";
import { IUser } from "../models/userModel.js";
import { AppError } from "../utils/errors/AppError.js";

type ChapterPayload = {
  title: string;
  content?: string;
};

type ChapterUpdatePayload = {
  title?: string;
  content?: string;
};

const isOwnerOrAdmin = (
  user: IUser | undefined,
  bookAuthorId: unknown,
): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.authorId?.toString() === String(bookAuthorId);
};

const getBookOrThrow = async (bookId: string) => {
  const book = await BookModel.findById(bookId);
  if (!book) throw new AppError("Book not found", 404);
  return book;
};

export const createChapter = async (
  bookId: string,
  user: IUser | undefined,
  payload: ChapterPayload,
) => {
  const book = await getBookOrThrow(bookId);
  if (!isOwnerOrAdmin(user, book.authorId))
    throw new AppError("UnAuthorized", 401);

  const chapter = await ChapterModel.create({
    ...payload,
    bookId: book._id,
  });

  if (!chapter) throw new Error("Chapter creation failed");

  await BookModel.findByIdAndUpdate(book._id, {
    $push: { chapters: chapter._id },
  });

  return chapter;
};

export const listChapters = async (
  bookId: string,
  user: IUser | undefined,
  status?: "draft" | "published",
) => {
  const book = await getBookOrThrow(bookId);
  const ownerOrAdmin = isOwnerOrAdmin(user, book.authorId);

  const query: mongoose.FilterQuery<IChapter> = { bookId: book._id };
  if (ownerOrAdmin) {
    if (status) query.status = status;
  } else {
    query.status = "published";
  }

  const chapters = await ChapterModel.find(query).lean();

  const orderMap = new Map(
    book.chapters.map((chapterId, index) => [chapterId.toString(), index]),
  );

  return chapters.sort((a, b) => {
    const aIndex = orderMap.get(a._id.toString()) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.get(b._id.toString()) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
};

export const getChapterById = async (
  bookId: string,
  chapterId: string,
  user: IUser | undefined,
) => {
  const book = await getBookOrThrow(bookId);
  const ownerOrAdmin = isOwnerOrAdmin(user, book.authorId);

  const chapter = await ChapterModel.findOne({
    _id: chapterId,
    bookId: book._id,
  });

  if (!chapter) throw new AppError("Chapter not found", 404);
  if (!ownerOrAdmin && chapter.status !== "published") {
    throw new AppError("Chapter not found", 404);
  }

  return chapter;
};

export const updateChapter = async (
  bookId: string,
  chapterId: string,
  user: IUser | undefined,
  updates: ChapterUpdatePayload,
) => {
  const book = await getBookOrThrow(bookId);
  if (!isOwnerOrAdmin(user, book.authorId))
    throw new AppError("UnAuthorized", 401);

  const chapter = await ChapterModel.findOneAndUpdate(
    {
      _id: chapterId,
      bookId: book._id,
    },
    updates,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!chapter) throw new AppError("Chapter not found", 404);
  return chapter;
};

export const deleteChapter = async (
  bookId: string,
  chapterId: string,
  user: IUser | undefined,
) => {
  const book = await getBookOrThrow(bookId);
  if (!isOwnerOrAdmin(user, book.authorId))
    throw new AppError("UnAuthorized", 401);

  const chapter = await ChapterModel.findOne({
    _id: chapterId,
    bookId: book._id,
  });
  if (!chapter) throw new AppError("Chapter not found", 404);

  try {
    await ChapterModel.deleteOne({ _id: chapter._id });
  } catch (error) {
    throw new AppError("could not delete chapter", 500);
  }
  await BookModel.findByIdAndUpdate(book._id, {
    $pull: { chapters: chapter._id },
  });
};

export const findChaptersOfBook = async (bookId: string, user: IUser) => {
  const book = await getBookOrThrow(bookId);
  if (!isOwnerOrAdmin(user, book.authorId))
    throw new AppError("UnAuthorized", 401);

  const chapters = await ChapterModel.find({
    _id: { $in: book.chapters },
  }).lean();
  return chapters;
};

export const findPreviewChaptersOfBook = async (bookId: string) => {
  const book = await getBookOrThrow(bookId);
  const chapters = await ChapterModel.find({
    _id: { $in: book.chapters },
  }).lean();

  const orderMap = new Map(
    book.chapters.map((chapterId, index) => [chapterId.toString(), index]),
  );

  return chapters.sort((a, b) => {
    const aIndex = orderMap.get(a._id.toString()) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.get(b._id.toString()) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
};

export const reorderChapters = async (
  bookId: string,
  user: IUser | undefined,
  newOrderIds: string[],
) => {
  const book = await getBookOrThrow(bookId);
  if (!isOwnerOrAdmin(user, book.authorId))
    throw new AppError("UnAuthorized", 401);

  const oldOrderIds = book.chapters.map((chId) => chId.toString());

  const isSameSet =
    new Set(oldOrderIds).size === new Set(newOrderIds).size &&
    newOrderIds.every((id) => oldOrderIds.includes(id));

  if (!isSameSet) throw new AppError("Invalid ordering", 400);

  await book.updateOne({ $set: { chapters: newOrderIds } });

  return ChapterModel.find({ bookId: book._id })
    .select("_id title wordCount status")
    .lean();
};
