import { AuthorModel, IAuthor } from "../models/authorModel.js";
import { UserModel } from "../models/userModel.js";
import { AuthorCreate, AuthorUpdate } from "../controllers/authorController.js";
import mongoose from "mongoose";
import { BookModel } from "../models/bookModel.js";
import { ReviewModel } from "../models/reviewModel.js";
import { AppError } from "../utils/errors/AppError.js";

export const createAuthorProfile = async (userId: mongoose.Types.ObjectId, author: AuthorCreate) => {
    const newAuthorProfile = await AuthorModel.create({
        userId,
        penName: author.penName,
        bio: author.bio,
        socialLinks: author.socialLinks,
        status: "pending",
        isVerified: false,
    });

    await UserModel.findOneAndUpdate({ _id: userId }, { role: "author", authorId: newAuthorProfile._id });

    return newAuthorProfile;
};

export const countBooksPublishedBy = async (id: string) => {
    return BookModel.countDocuments({ createdBy: id });
};

export const countReviewsForAuthor = async (userId: string) => {
    const books = await BookModel.find({ createdBy: userId }).select("_id");
    if (books.length === 0) return 0;
    const bookIds = books.map((book) => book._id);
    return ReviewModel.countDocuments({ book: { $in: bookIds } });
};

export const findAuthorByUserId = async (userId: string) => {
    const profile = await AuthorModel.findOne({ userId });
    if (!profile) throw new AppError("Not found", 404);
    return profile;
};

export const findAuthorByPenName = async (penName: string) => {
    const profile = await AuthorModel.findOne({ penName });
    if (!profile) throw new AppError("Not found", 404);
    return profile;
};

export const isPenNameUnique = async (penName: string) => {
    const existing = await AuthorModel.findOne({ penName });
    return !existing;
};

export const findByAuthorId = async (authorId: string) => {
    const author = await AuthorModel.findById(authorId);
    return author;
};
export const updateAuthorProfile = async (userId: mongoose.Types.ObjectId, updates: Partial<AuthorUpdate>) => {
    const updated = await AuthorModel.findOneAndUpdate({ userId }, updates, {
        new: true,
    });
    if (!updated) throw new AppError("Not found", 404);
    return updated;
};

type ListFilter = { name?: string; status?: string };
export const listAuthors = async (page: number, pageSize: number, filter?: ListFilter) => {
    const skip = Math.max(page - 1, 0) * pageSize;
    if (!filter) return await AuthorModel.find().skip(skip).limit(pageSize);

    for (const k of Object.keys(filter)) {
        if (!filter[k as keyof ListFilter]) delete filter[k as keyof ListFilter];
    }
    const query: Record<string, unknown> = {};
    if (filter.name) query.penName = filter.name;
    if (filter.status) query.status = filter.status;

    const authors = await AuthorModel.find(query).skip(skip).limit(pageSize);
    return authors;
};

type UpdateAuthorInput = Partial<IAuthor>;
export const updateAuthorAsAdmin = async (authorId: string, update: UpdateAuthorInput) => {
    const author = await AuthorModel.findByIdAndUpdate(authorId, update, { new: true });
    if (!author) throw new AppError("Author not found", 404);
    return author;
};
