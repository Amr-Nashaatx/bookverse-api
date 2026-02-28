import express, { Router } from "express";
import { auth, optionalAuth } from "../middlewares/authMiddleware.js";
import {
  createChapterController,
  deleteChapterController,
  getChapterController,
  listChaptersController,
  reorderChaptersController,
  updateChapterController,
} from "../controllers/chapterController.js";
import {
  validateCreateChapter,
  validateDeleteChapter,
  validateGetChapter,
  validateListChapters,
  validateReorderChapters,
  validateUpdateChapter,
} from "../middlewares/chapterValidators.js";

const router: Router = express.Router({ mergeParams: true });

router
  .route("/")
  .post(auth, validateCreateChapter, createChapterController)
  .get(optionalAuth, validateListChapters, listChaptersController);

router.put("/reorder", auth, validateReorderChapters, reorderChaptersController);

router
  .route("/:chapterId")
  .get(optionalAuth, validateGetChapter, getChapterController)
  .put(auth, validateUpdateChapter, updateChapterController)
  .delete(auth, validateDeleteChapter, deleteChapterController);

export default router;
