import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { CookieOptions } from "express";

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

export const sanitizeUser = (user: any) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isAuthor: user.isAuthor,
  role: user.role,
});

export const serializeUser = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isAuthor: user.isAuthor,
  role: user.role,
});
