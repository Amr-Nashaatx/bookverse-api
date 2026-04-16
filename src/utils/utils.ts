import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { CookieOptions, Response } from "express";
import mongoose from "mongoose";

dotenv.config();

export const signAccessToken = (user: any): string => {
  return jwt.sign(
    { userId: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET!,
    {
      expiresIn:
        process.env.NODE_ENV === "development"
          ? process.env.DEV_ACCESS_TOKEN_EXP || "10m"
          : "10m",
    } as any,
  );
};

export function signRefreshToken(userId: any, sessionId: any): string {
  return jwt.sign({ userId, sessionId }, process.env.DEV_REFRESH_SECRET!, {
    expiresIn:
      process.env.NODE_ENV === "development"
        ? process.env.DEV_REFRESH_TOKEN_EXP || "30d"
        : "30d",
  } as any);
}

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 10 * 60 * 60 * 1000,
};

export const tokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 10 * 60 * 60 * 1000,
};

export const clearTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "none",
  secure: process.env.NODE_ENV === "production",
};

export const toMongoId = (str: string) => {
  return new mongoose.Types.ObjectId(str);
};
export const setSSEHeaders = (res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
};
export const getSingleValueFromParams = (
  value: string | string[] | undefined,
) => (Array.isArray(value) ? value[0] : value);
