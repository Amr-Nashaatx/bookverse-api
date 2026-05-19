import mongoose, { FilterQuery } from "mongoose";
import { createClient, type RedisClientType } from "redis";
import { BookModel } from "../models/bookModel.js";
import type { Book, ReviewRequest } from "../models/bookModel.js";
import { ReviewModel } from "../models/reviewModel.js";
import { AppError } from "../utils/errors/AppError.js";
import { fetchPaginatedData } from "../utils/pagination.js";
import { CloudinaryProvider } from "./storage/CloundinaryProvider.js";
import { AuthorModel } from "../models/authorModel.js";
import { IUser } from "../models/userModel.js";
import { toMongoId } from "../utils/utils.js";
import { findChaptersOfBook } from "../services/chapterService.js";

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
    const authorId = (await AuthorModel.findOne({ userId }).select("_id").lean())?._id;

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
                books: [{ $skip: skip }, { $limit: limit }, { $project: { authorId: 0 } }],
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
            await redisClient.multi().del(listKey).rPush(listKey, genres).expire(listKey, ttl).exec();
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

type Updates = Partial<
    Omit<Book, "reviewRequest"> & {
        reviewRequest?: { reviewedAt?: Date; reviewedBy?: mongoose.Types.ObjectId; rejectionReason?: string };
    }
>;
export const updateBook = async (id: string, authorId: string, updates: Updates) => {
    const book = await BookModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        authorId,
    });
    if (!book) throw new AppError("UnAuthorized", 401);
    const updated = await BookModel.updateOne({ _id: id }, updates);
    if (!updated) throw new AppError("Book not found", 404);
    return updated;
};

export const updateBookAverageRating = async (id: mongoose.Types.ObjectId | string, averageRating: number) => {
    const updatedBook = await BookModel.findByIdAndUpdate(id, { averageRating }, { new: true });

    if (!updatedBook) throw new AppError("Book not found", 404);
    return updatedBook;
};

const validTransitions: Record<string, string[]> = {
    draft: ["preview", "published"],
    preview: ["published"],
    published: ["archived"],
    archived: [],
};

const assertValidBookTransition = (oldStatus: string, status: string) => {
    if (!validTransitions[oldStatus]) throw new AppError("Invalid current status", 400);
    if (!validTransitions[oldStatus].includes(status))
        throw new AppError(`Cannot transition from ${oldStatus} to ${status}`, 400);
};

export const updateBookStatus = async (id: string, authorId: string, status: string) => {
    const book = await BookModel.findOne({ _id: id, authorId });

    if (!book) throw new AppError("UnAuthorized", 401);

    assertValidBookTransition(book.status, status);

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

export const updateBookStatusAsAdmin = async (id: string, status: string) => {
    const book = await BookModel.findById(id);
    if (!book) throw new AppError("Book not found", 404);

    assertValidBookTransition(book.status, status);

    const updateData: any = { status };
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

    const filter = user.role === "admin" ? { _id: id } : { _id: id, authorId: user.authorId };

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

export const setReviewRequest = async (bookdId: string, authorId: string, request: ReviewRequest) => {
    const book = await BookModel.findOne({ _id: bookdId, authorId: toMongoId(authorId) });
    if (!book) throw new AppError("Book not found", 404);

    if (book.reviewRequest && !book.reviewRequest.reviewedAt)
        throw new AppError("Book already has a pending request", 400);

    const chapters = await findChaptersOfBook(book._id.toString(), authorId);
    const hasNonEmptyChapter = chapters.some((chapter) => chapter.content && chapter.content.trim().length > 0);
    const isBookReadyForReview = !!(
        book.title &&
        book.genre &&
        book.description &&
        chapters.length >= 1 &&
        hasNonEmptyChapter
    );

    if (!isBookReadyForReview) throw new AppError("Book is missing basic conditions for sumbission", 400);
    await BookModel.updateOne({ _id: bookdId, authorId: toMongoId(authorId) }, { reviewRequest: request });
};

export const setArchiveRequest = async (bookdId: string, authorId: string, request: ReviewRequest) => {
    const book = await BookModel.findOne({ _id: bookdId, authorId: toMongoId(authorId) });
    if (!book) throw new AppError("Book not found", 404);

    if (book.status !== "published") throw new AppError("Book must be in published state in order to archive", 400);
    if (book.reviewRequest && !book.reviewRequest.reviewedAt)
        throw new AppError("Book already has a pending request", 400);
    await BookModel.updateOne({ _id: bookdId, authorId: toMongoId(authorId) }, { reviewRequest: request });
};

const getBookWithReviewRequestOrThrow = async (
    bookId: string,
    requestedStatus: ReviewRequest["requestedStatus"],
    allowedStatuses: string[],
) => {
    const book = await BookModel.findById(bookId);
    if (!book) throw new AppError("Book not found", 404);
    if (!book.reviewRequest) throw new AppError("Book does not have a review request", 400);
    if (book.reviewRequest.requestedStatus !== requestedStatus) throw new AppError("Invalid review request", 400);
    if (book.reviewRequest.reviewedAt) throw new AppError("Review request has already been handled", 400);
    if (!allowedStatuses.includes(book.status)) {
        throw new AppError(`Book status must be ${allowedStatuses.join("/")} for this action`, 400);
    }

    return book;
};

export const approvePublishRequest = async (bookId: string) => {
    await getBookWithReviewRequestOrThrow(bookId, "published", ["draft", "preview"]);
    const book = await updateBookStatusAsAdmin(bookId, "published");
    await BookModel.findByIdAndUpdate(bookId, { $unset: { reviewRequest: 1 } });
    return book;
};

export const rejectPublishRequest = async (
    bookId: string,
    reviewedBy: mongoose.Types.ObjectId,
    rejectionReason: string,
) => {
    await getBookWithReviewRequestOrThrow(bookId, "published", ["draft", "preview"]);

    const updated = await BookModel.findByIdAndUpdate(
        bookId,
        {
            $set: {
                "reviewRequest.reviewedAt": new Date(),
                "reviewRequest.reviewedBy": reviewedBy,
                "reviewRequest.rejectionReason": rejectionReason,
            },
        },
        { new: true },
    );

    if (!updated) throw new AppError("Book not found", 404);
    return updated;
};

export const approveArchiveRequest = async (bookId: string) => {
    await getBookWithReviewRequestOrThrow(bookId, "archived", ["published"]);
    const book = await updateBookStatusAsAdmin(bookId, "archived");
    await BookModel.findByIdAndUpdate(bookId, { $unset: { reviewRequest: 1 } });
    return book;
};

export const rejectArchiveRequest = async (
    bookId: string,
    reviewedBy: mongoose.Types.ObjectId,
    rejectionReason: string,
) => {
    await getBookWithReviewRequestOrThrow(bookId, "archived", ["published"]);

    const updated = await BookModel.findByIdAndUpdate(
        bookId,
        {
            $set: {
                "reviewRequest.reviewedAt": new Date(),
                "reviewRequest.reviewedBy": reviewedBy,
                "reviewRequest.rejectionReason": rejectionReason,
            },
        },
        { new: true },
    );

    if (!updated) throw new AppError("Book not found", 404);
    return updated;
};

export const getPendingBooksAsAdmin = async () => {
    const books = await BookModel.find({
        $and: [{ reviewRequest: { $ne: null } }, { "reviewRequest.reviewedAt": null }],
    });
    return books;
};
