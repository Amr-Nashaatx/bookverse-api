import mongoose from "mongoose";
import { ShelfModel } from "../models/shelfModel.js";
import { AppError } from "../utils/errors/AppError.js";
import { populateAuthorsOnShelfBooks } from "../utils/pipelines.js";

export const createShelf = async (userId: any, data: any) => {
  const shelf = await ShelfModel.create({ ...data, user: userId });
  return shelf;
};

export const getShelves = async (userId: any) => {
  const shelves = await ShelfModel.aggregate([
    {
      $match: { user: userId },
    },
    {
      $addFields: {
        booksCount: { $size: "$books" },
      },
    },
  ]);
  return shelves;
};

export const getShelfById = async (
  userId: mongoose.Types.ObjectId,
  shelfId: mongoose.Types.ObjectId,
) => {
  const pipeline = populateAuthorsOnShelfBooks(shelfId, userId);
  const shelf = (await ShelfModel.aggregate(pipeline))[0];

  if (!shelf) throw new AppError("Shelf not found", 404);
  return shelf;
};

export const updateShelf = async (userId: any, shelfId: any, updates: any) => {
  const shelf = await ShelfModel.findOneAndUpdate(
    { _id: shelfId, user: userId },
    updates,
    { new: true },
  );
  if (!shelf) throw new AppError("Shelf not found", 404);
  return shelf;
};

export const deleteShelf = async (userId: any, shelfId: any) => {
  const shelf = await ShelfModel.findOneAndDelete({
    _id: shelfId,
    user: userId,
  });
  if (!shelf) throw new AppError("Shelf not found", 404);
  return shelf;
};

export const addBookToShelf = async (
  userId: any,
  shelfId: any,
  bookId: any,
) => {
  const shelf = await ShelfModel.findOne({ _id: shelfId, user: userId });
  if (!shelf) throw new AppError("Shelf not found", 404);

  if (shelf.books.includes(bookId)) {
    throw new AppError("Book already in shelf", 400);
  }

  shelf.books.push(bookId);
  await shelf.save();
  return shelf;
};

export const removeBookFromShelf = async (
  userId: any,
  shelfId: any,
  bookId: any,
) => {
  const shelf = await ShelfModel.findOne({ _id: shelfId, user: userId });
  if (!shelf) throw new AppError("Shelf not found", 404);

  shelf.books = shelf.books.filter((id: any) => id.toString() !== bookId);
  await shelf.save();
  return shelf;
};
