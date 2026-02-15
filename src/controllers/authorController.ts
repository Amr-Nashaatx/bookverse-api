import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { AppError } from "../utils/errors/AppError.js";
import { APIResponse } from "../utils/response.js";
import * as authorService from "../services/authorService.js";

export type AuthorCreate = {
  penName: string;
  bio?: string;
  socialLinks?: {
    website?: string;
    x?: string;
    instagram?: string;
    linkedIn?: string;
    facebook?: string;
  };
};

export const createProfile = asyncHandler(async (req: any, res: Response) => {
  const authorData = req.body as AuthorCreate;
  const userId = req.user!._id;

  if (req.user?.isAuthor) {
    throw new AppError("User already has an author profile", 400);
  }

  const isUnique = await authorService.isPenNameUnique(authorData.penName);
  if (!isUnique) {
    throw new AppError("Pen name must be unique", 400);
  }

  const newAuthorProfile = await authorService.createAuthorProfile(
    userId,
    authorData,
  );
  const response = new APIResponse(
    "success",
    "Author profile created successfully",
  );
  response.addResponseData("author", {
    _id: newAuthorProfile._id,
    userId,
    penName: newAuthorProfile.penName,
    status: newAuthorProfile.status,
  });
  res.status(201).json(response);
});

export const findProfileByPenName = asyncHandler(
  async (req: Request, res: Response) => {
    const penName = req.params.penName;
    const author = await authorService.findAuthorByPenName(penName);
    const totalBooksPublished = await authorService.countBooksPublishedBy(
      author.userId.toString(),
    );
    const totalReviews = await authorService.countReviewsForAuthor(
      author.userId.toString(),
    );
    const response = new APIResponse("success", "Author fetched");
    response.addResponseData("author", {
      penName: author.penName,
      bio: author.bio,
      isVerified: author.isVerified,
      totalBooksPublished,
      totalReviews,
      socialLinks: author.socialLinks,
    });
    res.status(200).json(response);
  },
);

export const findCurrentUserProfile = asyncHandler(
  async (req: any, res: Response) => {
    if (!req.user?.isAuthor) {
      throw new AppError("Author profile not found", 404);
    }

    const author = await authorService.findAuthorByUserId(req.user._id);
    const totalBooksPublished = await authorService.countBooksPublishedBy(
      req.user._id.toString(),
    );
    const totalReviews = await authorService.countReviewsForAuthor(
      req.user._id.toString(),
    );
    const response = new APIResponse("success", "Author fetched");
    response.addResponseData("author", {
      ...author.toObject(),
      totalBooksPublished,
      totalReviews,
    });
    res.status(200).json(response);
  },
);

export const updateCurrentUserProfile = asyncHandler(
  async (req: any, res: Response) => {
    if (!req.user?.isAuthor) {
      throw new AppError("Author profile not found", 404);
    }

    const currentProfile = await authorService.findAuthorByUserId(req.user._id);
    if (req.body?.penName && req.body.penName !== currentProfile.penName) {
      const isUnique = await authorService.isPenNameUnique(req.body.penName);
      if (!isUnique) {
        throw new AppError("Pen name must be unique", 400);
      }
    }

    const updated = await authorService.updateAuthorProfile(
      req.user._id,
      req.body,
    );

    const response = new APIResponse(
      "success",
      "Author profile updated successfully",
    );
    response.addResponseData("author", updated);
    res.status(200).json(response);
  },
);
