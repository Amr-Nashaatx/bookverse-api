import { IUser, UserModel } from "../models/userModel";

export const updateUser = async (id: string, updates: Partial<IUser>) => {
  const updatedUser = await UserModel.findOneAndUpdate({ _id: id }, updates, {
    new: true,
  });
  return updatedUser;
};
