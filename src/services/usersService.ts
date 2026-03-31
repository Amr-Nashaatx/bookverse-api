import { IUser, UserModel } from "../models/userModel";
import { AppError } from "../utils/errors/AppError";
import { CloudinaryProvider } from "./storage/CloundinaryProvider";
import mongoose from "mongoose";

export const updateUser = async (id: string, updates: Partial<IUser>) => {
  const updatedUser = await UserModel.findOneAndUpdate({ _id: id }, updates, {
    new: true,
  });
  return updatedUser;
};

export const uploadAvatar = async (userId: string, fileBuffer: Buffer) => {
  const userToUpdate = await UserModel.findById(userId);
  if (!userToUpdate) throw new AppError("Not found", 404);
  const storage = new CloudinaryProvider();
  const result = await storage.uploadImage(fileBuffer, "users-avatars");

  const updatedUser = await UserModel.findByIdAndUpdate(
    new mongoose.Types.ObjectId(userId),
    {
      avatar: result.secure_url,
    },
    { new: true },
  );

  return updatedUser;
};
