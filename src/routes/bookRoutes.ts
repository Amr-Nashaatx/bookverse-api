import express, { Router } from "express";
import * as bookController from "../controllers/bookController.js";
import {
    validateCreateBook,
    validatePublishRequest,
    validateRequestArchive,
    validateUpdateBook,
    validateUpdateBookStatus,
} from "../middlewares/bookValidators.js";
import { auth } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import { isAuthor } from "../middlewares/isAuthorMiddleware.js";
import chapterRoutes from "./chapterRoutes.js";

const router: Router = express.Router();

router
    .route("/")
    .get(bookController.getBooksController)
    .post(auth, upload.single("cover"), validateCreateBook, bookController.createBookController);

router.get("/my-books", auth, isAuthor, bookController.getMyBooksController);
router.get("/genres", bookController.getGenresController);

router
    .route("/:id")
    .get(bookController.getBookByIdController)
    .put(auth, validateUpdateBook, bookController.updateBookController)
    .delete(auth, bookController.deleteBookController);

router.put("/:id/status", auth, isAuthor, validateUpdateBookStatus, bookController.updateBookStatusController);
router.post("/:id/submit-for-review", auth, isAuthor, validatePublishRequest, bookController.submitForReview);
router.post("/:id/request-archive", auth, isAuthor, validateRequestArchive, bookController.requestArchive);

router.get("/:id/preview", auth, isAuthor, bookController.generateBookPreviewController);
router.post("/:id/cover", auth, upload.single("cover"), bookController.uploadBookCoverController);

router.use("/:bookId/chapters", chapterRoutes);

export default router;
