import bcrypt from "bcrypt";
import { UserModel } from "../models/userModel.js";
import { AppError } from "../utils/errors/AppError.js";
import { signAccessToken, signRefreshToken } from "../utils/utils.js";
import { Session } from "../models/session.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export const registerUser = async (
  name: string,
  email: string,
  password: string,
): Promise<any> => {
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new AppError("Email already exists", 400);
  }

  const newUser = await UserModel.create({ name, email, password });

  const sessionId = new mongoose.Types.ObjectId();
  const accessToken = signAccessToken(newUser);
  const refreshToken = signRefreshToken(newUser._id, sessionId);

  await Session.create({
    _id: sessionId,
    userId: newUser._id,
    refreshTokenHash: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return {
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
    token: accessToken,
    refreshToken,
  };
};

export const refresh = async (refreshToken: string): Promise<any> => {
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, process.env.DEV_REFRESH_SECRET || "");
  } catch (error) {
    throw new AppError("Invalid refresh", 401);
  }

  const session = await Session.findById(payload.sessionId);
  if (!session || session.revokedAt) {
    throw new AppError("No session", 401);
  }

  if (!bcrypt.compare(refreshToken, session.refreshTokenHash)) {
    // token reuse → revoke session
    session.revokedAt = new Date(Date.now());
    await session.save();
    throw new AppError("session revoked", 401);
  }

  // rotate
  const user = await UserModel.findById(payload.userId);
  if (!user) throw new AppError("User not found", 404);

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(payload.userId, payload.sessionId);

  const salt = await bcrypt.genSalt(10);
  session.refreshTokenHash = await bcrypt.hash(newRefreshToken, salt);

  await session.save();

  return { newRefreshToken, newAccessToken };
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<any> => {
  const user = await UserModel.findOne({ email }).select("+password");
  if (!user) throw new AppError("Email or password is wrong", 400);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError("Email or password is wrong", 400);

  const sessionId = new mongoose.Types.ObjectId();

  const acessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user._id, sessionId);

  await Session.create({
    _id: sessionId,
    userId: user._id,
    refreshTokenHash: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorId: user.authorId,
    },
    token: acessToken,
    refreshToken,
  };
};

export const revokeSession = async (sessionId: any): Promise<void> => {
  await Session.findByIdAndUpdate(
    sessionId,
    { revokedAt: new Date(Date.now()) },
    { new: true },
  );
};
