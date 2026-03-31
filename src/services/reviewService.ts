import mongoose from "mongoose";
import { ReviewModel } from "../models/reviewModel.js";
import { updateBookAverageRating } from "../services/bookService.js";
import { AppError } from "../utils/errors/AppError.js";
import { fetchPaginatedData } from "../utils/pagination.js";

export const getReviewsOfBook = async (
  bookId: any,
  paginationParameters: any,
): Promise<any> => {
  const queryOptions = {
    findCriteria: {
      fieldName: "book",
      value: new mongoose.Types.ObjectId(bookId),
    },
    populate: ["user", "name email"],
  };
  const reviews = await fetchPaginatedData(
    ReviewModel,
    paginationParameters,
    queryOptions,
  );

  return reviews;
};

export const isBookReviewed = async (
  currUserId: any,
  bookId: any,
): Promise<boolean> => {
  const isReviewd = !!(await ReviewModel.findOne({
    user: currUserId,
    book: bookId,
  }));
  return isReviewd;
};

export const createReview = async (newReview: any): Promise<any> => {
  const review = await ReviewModel.create(newReview);
  await calculateAvgRatingOfBook(review.book); // Potentail performance issue here
  return review;
};

export const getReviewById = async (reviewId: any): Promise<any> => {
  const review = await ReviewModel.findById(reviewId);
  return review;
};

export const updateReview = async (
  reviewId: any,
  reviewUpdates: any,
): Promise<any> => {
  const review = await ReviewModel.findByIdAndUpdate(reviewId, reviewUpdates, {
    new: true,
  });
  if (!review) throw new AppError("Review not found", 404);
  if (reviewUpdates.rating) await calculateAvgRatingOfBook(review.book); // update average rating of a book only if review rating is updated.

  return review;
};

export const deleteReview = async (reviewId: any): Promise<any> => {
  const review = await ReviewModel.findByIdAndDelete(reviewId);
  if (!review) throw new AppError("Review not found", 404);
  return review;
};

export const calculateAvgRatingOfBook = async (bookId: any): Promise<void> => {
  const aggregationResult = await ReviewModel.aggregate([
    { $match: { book: bookId } },
    {
      $group: { _id: "$book", avgRating: { $avg: "$rating" } },
    },
  ]);

  const avgRating = aggregationResult[0]?.avgRating || 0;
  await updateBookAverageRating(bookId, avgRating);
};
