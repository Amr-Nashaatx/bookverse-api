import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { getSingleValueFromParams } from "../utils/utils.js";
import { APIResponse } from "../utils/response.js";
import * as authorService from "../services/authorService.js";
import * as bookService from "../services/bookService.js";

export const approveAuthor = asyncHandler(async (req: Request, res: Response) => {
    const authorId = getSingleValueFromParams(req.params.id)!;
    await authorService.updateAuthorAsAdmin(authorId, {
        status: "approved",
    });

    const apiRes = new APIResponse("success", "author has been approved");
    res.status(204).send(apiRes);
});

export const rejectAuthor = asyncHandler(async (req: Request, res: Response) => {
    const authorId = getSingleValueFromParams(req.params.id)!;
    const { rejectionReason } = req.body;
    await authorService.updateAuthorAsAdmin(authorId, {
        status: "rejected",
        rejectionReason: rejectionReason ?? "",
    });

    const apiRes = new APIResponse("success", "author has been rejected");
    res.status(204).send(apiRes);
});

export const listAuthors = asyncHandler(async (req: Request, res: Response) => {
    const name = (req.query.name as string) ?? "";
    const status = (req.query.status as string) ?? "";
    const page = (req.query.page as string) ?? 1;

    const authors = await authorService.listAuthors(parseInt(page), 16, {
        name,
        status,
    });

    const apiRes = new APIResponse("success", "Authors List");
    apiRes.addResponseData("authors", authors);
    res.send(apiRes);
});

export const approvePublish = asyncHandler(async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.id);
    await bookService.approvePublishRequest(bookId);

    res.status(204).send(new APIResponse("success", "Book publish request approved"));
});

export const rejectPublish = asyncHandler(async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.id);
    const rejectionReason = req.body.rejectionReason ?? "";
    await bookService.rejectPublishRequest(bookId, req.user!._id, rejectionReason);
    res.status(204).send(new APIResponse("success", "Book publish request has been rejected"));
});

export const approveArchive = asyncHandler(async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.id);
    await bookService.approveArchiveRequest(bookId);

    res.status(204).send(new APIResponse("success", "Book archive request approved"));
});

export const rejectArchive = asyncHandler(async (req: Request, res: Response) => {
    const bookId = getSingleValueFromParams(req.params.id);
    const rejectionReason = req.body.rejectionReason ?? "";
    await bookService.rejectArchiveRequest(bookId, req.user!._id, rejectionReason);

    res.status(204).send(new APIResponse("success", "Book archive request has been rejected"));
});

export const listPendingBooks = asyncHandler(async (req: Request, res: Response) => {
    const books = await bookService.getPendingBooksAsAdmin();
    const apiRes = new APIResponse("success", "Books List");
    apiRes.addResponseData("books", books);
    res.send(apiRes);
});
