import { AuthorModel } from "../models/authorModel.js";
import { UserModel } from "../models/userModel.js";
import { AuthorCreate } from "../controllers/authorController.js";
import mongoose from "mongoose";
import { BookModel } from "../models/bookModel.js";
import { ReviewModel } from "../models/reviewModel.js";
import { AppError } from "../utils/errors/AppError.js";

export const createAuthorProfile = async (
  userId: mongoose.Types.ObjectId,
  author: AuthorCreate,
) => {
  const newAuthorProfile = await AuthorModel.create({
    userId,
    penName: author.penName,
    bio: author.bio,
    avatar: author.avatar,
    socialLinks: author.socialLinks,
    status: "pending",
    isVerified: false,
  });

  await UserModel.findOneAndUpdate(
    { _id: userId },
    { role: "author", isAuthor: true },
  );

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

export const updateAuthorProfile = async (
  userId: mongoose.Types.ObjectId,
  updates: Partial<AuthorCreate>,
) => {
  const updated = await AuthorModel.findOneAndUpdate(
    { userId },
    updates,
    { new: true },
  );
  if (!updated) throw new AppError("Not found", 404);
  return updated;
};
