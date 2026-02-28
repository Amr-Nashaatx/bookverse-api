import jwt from "jsonwebtoken";
import { AppError } from "../utils/errors/AppError.js";
import { asyncHandler } from "./asyncHandler.js";
import { UserModel } from "../models/userModel.js";
import { Request, Response, NextFunction } from "express";

export const auth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.jwt_token ?? "";
    let isValidToken;
    try {
      isValidToken = jwt.verify(token, process.env.JWT_SECRET || "");
    } catch (e) {
      throw new AppError("Inavalid token", 401);
    }
    if (!isValidToken) throw new AppError("Inavalid token", 401);
    const { userId } = jwt.decode(token) as any;
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("No user associated with this token", 400);
    req.user = user;
    next();
  },
);

export const optionalAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.jwt_token;
    if (!token) return next();

    try {
      jwt.verify(token, process.env.JWT_SECRET || "");
      const { userId } = jwt.decode(token) as any;
      const user = await UserModel.findById(userId);
      if (user) req.user = user;
    } catch {}

    next();
  },
);
