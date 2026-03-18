import { asyncHandler } from "../middlewares/asyncHandler.js";
import { APIResponse } from "../utils/response.js";
import {
  createShelf,
  getShelves,
  getShelfById,
  updateShelf,
  deleteShelf,
  addBookToShelf,
  removeBookFromShelf,
} from "../services/shelfService.js";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export const createShelfController = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const shelf = await createShelf(userId, req.body);
    const response = new APIResponse("success", "Shelf created successfully");
    response.addResponseData("shelf", shelf);
    res.status(201).json(response);
  },
);

export const getShelvesController = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const shelves = await getShelves(userId);
    const response = new APIResponse("success", "Shelves fetched successfully");
    response.addResponseData("shelves", shelves);
    res.status(200).json(response);
  },
);

export const getShelfByIdController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!._id;
    const shelfId = new mongoose.Types.ObjectId(req.params.id);
    const shelf = await getShelfById(userId, shelfId);
    const response = new APIResponse("success", "Shelf fetched successfully");
    response.addResponseData("shelf", shelf);
    res.status(200).json(response);
  },
);

export const updateShelfController = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const shelf = await updateShelf(userId, req.params.id, req.body);
    const response = new APIResponse("success", "Shelf updated successfully");
    response.addResponseData("shelf", shelf);
    res.status(200).json(response);
  },
);

export const deleteShelfController = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    await deleteShelf(userId, req.params.id);
    res
      .status(200)
      .json(new APIResponse("success", "Shelf deleted successfully"));
  },
);

export const addBookToShelfController = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { bookId } = req.body;
    const shelf = await addBookToShelf(userId, req.params.id, bookId);
    const response = new APIResponse(
      "success",
      "Book added to shelf successfully",
    );
    response.addResponseData("shelf", shelf);
    res.status(200).json(response);
  },
);

export const removeBookFromShelfController = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { bookId } = req.params;
    const shelf = await removeBookFromShelf(userId, req.params.id, bookId);
    const response = new APIResponse(
      "success",
      "Book removed from shelf successfully",
    );
    response.addResponseData("shelf", shelf);
    res.status(200).json(response);
  },
);
