import mongoose, { SortValues } from "mongoose";
import { BookModel, Book } from "../models/bookModel.js";
import { ReviewModel } from "../models/reviewModel.js";
import { AppError } from "../utils/errors/AppError.js";
import { fetchPaginatedData } from "../utils/pagination.js";
import Redis from "ioredis";
import { CloudinaryProvider } from "./storage/CloundinaryProvider.js";
import { AuthorModel } from "../models/authorModel.js";

const redis = new Redis({
  host: "redis",
  port: 6379,
});
redis.on("error", () => {});

export const createBook = async (data: Book) => {
  const book = await BookModel.create(data);
  return book;
};

export const createBookWithCover = async (data: Book, cover: Buffer) => {
  const book = await BookModel.create(data);
  const storageProvider = new CloudinaryProvider();

  const result = await storageProvider.uploadImage(cover, "book-covers");
  const bookWithCover = (await BookModel.findByIdAndUpdate(
    book._id,
    {
      coverImage: result.secure_url,
      coverPublicId: result.public_id,
    },
    { new: true },
  ))!;

  return bookWithCover;
};

export const getBooks = async (paginationParameters: any) => {
  const result = fetchPaginatedData(BookModel, paginationParameters);
  return result;
};

export const getMyBooks = async (
  userId: mongoose.Types.ObjectId,
  filters: mongoose.FilterQuery<Book> = {},
  sort: Record<string, 1 | -1> = {},
  pagination: { page?: number; limit?: number } = {},
) => {
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;
  const authorId = (await AuthorModel.findOne({ userId }).select("_id").lean())
    ?._id;

  const result = await BookModel.aggregate([
    { $match: { authorId, ...filters } },
    {
      $lookup: {
        from: "authors",
        localField: "authorId",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },
    { $sort: Object.keys(sort).length ? sort : { createdAt: 1 } },
    {
      $facet: {
        books: [
          { $skip: skip },
          { $limit: limit },
          { $project: { authorId: 0 } },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const myBooks = result[0].books;
  const totalCount = result[0].totalCount[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    books: myBooks,
    pageInfo: {
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export const getGenres = async () => {
  const listKey = `books:genres`;
  const ttl = 3600; // 1 hour
  try {
    const cachedGenres = await redis.lrange(listKey, 0, -1);
    if (cachedGenres.length > 0) {
      return cachedGenres;
    }
  } catch {}

  const result = await BookModel.aggregate([
    {
      $group: {
        _id: "$genre",
      },
    },
    {
      $project: {
        _id: 0,
        genre: "$_id",
      },
    },
  ]);
  const genres = result.map((g: any) => g.genre);
  try {
    if (genres.length > 0) {
      await redis
        .multi()
        .del(listKey)
        .rpush(listKey, ...genres)
        .expire(listKey, ttl)
        .exec();
    }
  } catch {}
  return genres;
};

export const getBookById = async (id: string) => {
  const book = await BookModel.findById(id);
  if (!book) throw new AppError("Book not found", 404);
  return book;
};

export const updateBook = async (
  id: string,
  userId: string,
  updates: Partial<Book>,
) => {
  const book = await BookModel.findOne({ id, authorId: userId });
  if (!book) throw new AppError("UnAuthorized", 401);
  if (book.status !== "draft")
    throw new AppError("Book must be in draft to edit", 400);
  const updated = await BookModel.updateOne({ id }, updates);
  if (!updated) throw new AppError("Book not found", 404);
  return updated;
};

export const deleteBook = async (id: string) => {
  const useTransactions = process.env.NODE_ENV !== "test";
  let session: any = null;

  if (useTransactions) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  let deleted = null;

  try {
    deleted = await BookModel.findByIdAndDelete(id);
    if (!deleted) throw new AppError("Book not found", 404);

    await ReviewModel.deleteOne(
      { book: deleted._id },
      useTransactions ? { session } : {},
    );

    if (useTransactions) {
      await session.commitTransaction();
      session.endSession();
    }
  } catch (err) {
    if (useTransactions) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }

  return deleted;
};

export const uploadBookCover = async (id: string, fileBuffer: Buffer) => {
  const storageProvider = new CloudinaryProvider();

  const book = await BookModel.findById(id);
  if (!book) {
    throw new AppError("Book not found", 404);
  }
  const result = await storageProvider.uploadImage(fileBuffer, "book-covers");

  const updatedBook = await BookModel.findByIdAndUpdate(
    id,
    {
      coverImage: result.secure_url,
      coverPublicId: result.public_id,
    },
    { new: true },
  );

  return updatedBook;
};
