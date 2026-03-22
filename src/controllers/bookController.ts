import { asyncHandler } from "../middlewares/asyncHandler.js";
import { APIResponse } from "../utils/response.js";
import {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  updateBookStatus,
  deleteBook,
  getGenres,
  uploadBookCover,
  getMyBooks,
  createBookWithCover,
} from "../services/bookService.js";
import * as chapterService from "../services/chapterService.js";
import * as previewService from "../services/previewService.js";
import { buildBookFilters } from "../utils/filters.js";
import { AppError } from "../utils/errors/AppError.js";
import { Request, Response, NextFunction } from "express";
import { Book } from "../models/bookModel.js";
import mongoose from "mongoose";

export const createBookController = asyncHandler(
  async (req: Request, res: Response) => {
    const authorId = req.user!.authorId;
    const book = req.body as Book;
    let createdBook: Awaited<ReturnType<typeof createBook>>;
    if (req.file) {
      const buffer = req.file.buffer;
      createdBook = await createBookWithCover(
        {
          ...book,
          authorId,
        },
        buffer,
      );
    } else {
      createdBook = await createBook({
        ...book,
        authorId,
      });
    }
    const response = new APIResponse("success", "Book created successfully");
    response.addResponseData("book", createdBook);
    res.status(201).json(response);
  },
);

export const getMyBooksController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const allowedStatuses = ["published", "draft"];
    const query = req.query;

    // Pagination parameters
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;

    let filter = {} as mongoose.FilterQuery<Book>;
    let sort = {} as { [key in string]: 1 | -1 };
    if (query) {
      const status = query.status as string;
      const sortBy = query.sortBy as string;
      if (status && allowedStatuses.includes(status)) filter["status"] = status;
      switch (sortBy) {
        case "title":
          sort["title"] = 1;
        case "status":
          sort["status"] = 1;
      }
    }
    const { books, pageInfo } = await getMyBooks(userId, filter, sort, {
      page,
      limit,
    });
    const response = new APIResponse(
      "success",
      "Fetched your books successfully",
    );
    response.addResponseData("books", books);
    response.addResponseData("pageInfo", pageInfo);
    res.status(200).json(response);
  },
);

export const uploadBookCoverController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError("No image uploaded", 400);
    }
    const bookId = req.params.id;
    const buffer = req.file.buffer;
    const updatedBook = await uploadBookCover(bookId, buffer);

    const response = new APIResponse(
      "success",
      "Cover image uploaded created successfully",
    );
    response.addResponseData("book", updatedBook);
    res.status(200).json(response);
  },
);

export const getGenresController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const genres = await getGenres();
    const response = new APIResponse("success", "Genres fetched successfully");
    response.addResponseData("genres", genres);
    res.status(200).json(response);
  },
);

export const getBooksController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { after, before, limit, sort = "-_id" } = req.query;
    const filters = buildBookFilters(req.query);
    const paginationParameters = { after, before, limit, sort, filters };
    const { books, pageInfo } = await getBooks(paginationParameters);
    const response = new APIResponse("success", "Books fetched successfully");
    response.addResponseData("books", books);
    response.addResponseData("pageInfo", pageInfo);
    res.status(200).json(response);
  },
);

export const getBookByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = req.params.id;
    const book = await getBookById(bookId);
    // if (!(book.status === "published")) throw new AppError("UnAuthorized", 401);
    const response = new APIResponse("success", "Book fetched successfully");
    response.addResponseData("book", book);
    res.status(200).json(response);
  },
);

export const generateBookPreviewController = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const bookId = req.params.id;
      const user = req.user!;
      const book = await getBookById(bookId);
      const chapters = await chapterService.findChaptersOfBook(bookId, user);
      const pdf = await previewService.generateBookPreview(book, chapters);

      res.setHeader("Content-Type", "application/pdf");
      // inline means open in browser tab rather than force download
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${book.title}.pdf"`,
      );
      res.send(pdf);
    } catch (error) {
      throw new AppError("Failed to generate preview", 500, error);
    }
  },
);

export const updateBookController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = req.params.id;
    const authorId = req.user!.authorId;
    const bookUpdate = req.body as Book;

    const book = await updateBook(bookId, authorId.toString(), bookUpdate);
    const response = new APIResponse("success", "Book Updated successfully");
    response.addResponseData("book", book);
    res.status(200).json(response);
  },
);

export const updateBookStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const bookId = req.params.id;
    const authorId = req.user!.authorId;
    const { status } = req.body;
    const book = await updateBookStatus(bookId, authorId.toString(), status);
    const response = new APIResponse(
      "success",
      "Book status updated successfully",
    );
    response.addResponseData("book", book);
    res.status(200).json(response);
  },
);

export const deleteBookController = asyncHandler(
  async (req: Request, res: Response) => {
    await deleteBook(req.params.id);
    res
      .status(200)
      .json(new APIResponse("success", "Book deleted successfully"));
  },
);
