import express, { Router } from "express";
import {
  createBookController,
  getBookByIdController,
  updateBookController,
  deleteBookController,
  getBooksController,
  getGenresController,
  uploadBookCoverController,
  getMyBooksController,
  updateBookStatusController,
  generateBookPreviewController,
} from "../controllers/bookController.js";
import {
  validateCreateBook,
  validateUpdateBook,
  validateUpdateBookStatus,
} from "../middlewares/bookValidators.js";
import { auth } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import {
  isAuthor,
  isAuthorOrAdmin,
} from "../middlewares/isAuthorMiddleware.js";
import chapterRoutes from "./chapterRoutes.js";

const router: Router = express.Router();

router
  .route("/")
  .get(getBooksController)
  .post(auth, upload.single("cover"), validateCreateBook, createBookController);

router.get("/my-books", auth, isAuthor, getMyBooksController);
router.get("/genres", getGenresController);

router
  .route("/:id")
  .get(getBookByIdController)
  .put(auth, validateUpdateBook, updateBookController)
  .delete(auth, deleteBookController);

router.put(
  "/:id/status",
  auth,
  isAuthorOrAdmin,
  validateUpdateBookStatus, 
  updateBookStatusController,
);

router.get("/:id/preview", auth, generateBookPreviewController);
router.post(
  "/:id/cover",
  auth,
  upload.single("cover"),
  uploadBookCoverController,
);

router.use("/:bookId/chapters", chapterRoutes);

export default router;
