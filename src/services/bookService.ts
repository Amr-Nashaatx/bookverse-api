import mongoose from "mongoose";
import { createClient, type RedisClientType } from "redis";
import { BookModel } from "../models/bookModel.js";
import type { Book } from "../models/bookModel.js";
import { ReviewModel } from "../models/reviewModel.js";
import { AppError } from "../utils/errors/AppError.js";
import { fetchPaginatedData } from "../utils/pagination.js";
import { CloudinaryProvider } from "./storage/CloundinaryProvider.js";
import { AuthorModel } from "../models/authorModel.js";
import { IUser } from "../models/userModel.js";

const redis: RedisClientType = createClient({
  socket: {
    host: "redis",
    port: 6379,
  },
});
redis.on("error", () => {});

let redisConnectionPromise: Promise<RedisClientType> | null = null;

const getRedisClient = async () => {
  if (redis.isOpen) return redis;

  if (!redisConnectionPromise) {
    redisConnectionPromise = redis.connect().then(() => redis);
    redisConnectionPromise.catch(() => {
      redisConnectionPromise = null;
    });
  }

  return redisConnectionPromise;
};

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
  const result = await fetchPaginatedData(BookModel, paginationParameters, {
    populate: ["authorId", "penName"],
  });
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
    const redisClient = await getRedisClient();
    const cachedGenres = await redisClient.lRange(listKey, 0, -1);
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
      const redisClient = await getRedisClient();
      await redisClient
        .multi()
        .del(listKey)
        .rPush(listKey, genres)
        .expire(listKey, ttl)
        .exec();
    }
  } catch {}
  return genres;
};

export const getBookById = async (id: string) => {
  const book = (await BookModel.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(id) },
    },
    {
      $lookup: {
        from: "authors",
        localField: "authorId",
        foreignField: "_id",
        as: "author",
      },
    },
  ])) as Book[];
  if (!book) throw new AppError("Book not found", 404);
  return book[0];
};

export const updateBook = async (
  id: string,
  authorId: string,
  updates: Partial<Book>,
) => {
  const book = await BookModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    authorId,
  });
  if (!book) throw new AppError("UnAuthorized", 401);
  if (book.status !== "draft")
    throw new AppError("Book must be in draft to edit", 400);
  const updated = await BookModel.updateOne({ _id: id }, updates);
  if (!updated) throw new AppError("Book not found", 404);
  return updated;
};

export const updateBookAverageRating = async (
  id: mongoose.Types.ObjectId | string,
  averageRating: number,
) => {
  const updatedBook = await BookModel.findByIdAndUpdate(
    id,
    { averageRating },
    { new: true },
  );

  if (!updatedBook) throw new AppError("Book not found", 404);
  return updatedBook;
};

export const updateBookStatus = async (
  id: string,
  authorId: string,
  status: string,
) => {
  const book = await BookModel.findOne({ _id: id, authorId });

  if (!book) throw new AppError("UnAuthorized", 401);

  const oldStatus = book.status;
  const validTransitions: Record<string, string[]> = {
    draft: ["preview"],
    preview: ["published", "archived"],
    published: ["archived"],
    archived: [],
  };

  if (!validTransitions[oldStatus])
    throw new AppError("Invalid current status", 400);
  if (!validTransitions[oldStatus].includes(status))
    throw new AppError(`Cannot transition from ${oldStatus} to ${status}`, 400);

  // Check if transitioning from draft to preview - must have chapters with content
  if (oldStatus === "draft" && status === "preview") {
    const chaptersWithContent = book.chapters && book.chapters.length > 0;
    if (!chaptersWithContent) {
      throw new AppError("Book must have at least 1 chapter with content", 400);
    }
  }

  const updateData: any = { status };

  // Only set publishedAt when transitioning to published
  if (status === "published") {
    updateData.publishedAt = new Date();
  }

  const updated = await BookModel.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  if (!updated) throw new AppError("Book not found", 404);
  return updated;
};

export const deleteBook = async (id: string, user: IUser) => {
  let deleted: Book | null = null;

  if (user.role !== "admin" && !user.authorId) {
    throw new AppError("UnAuthorized", 401);
  }

  const filter =
    user.role === "admin" ? { _id: id } : { _id: id, authorId: user.authorId };

  try {
    deleted = await BookModel.findOneAndDelete(filter);
    if (!deleted) throw new AppError("Book not found", 404);
  } catch (err) {
    throw err;
  }
  await ReviewModel.deleteMany({ book: deleted._id });

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
