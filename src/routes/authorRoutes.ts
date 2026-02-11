import express from "express";
import { auth } from "../middlewares/authMiddleware.js";
import * as authorsController from "../controllers/authorController.js";
import {
  validateCreateAuthor,
  validateUpdateAuthor,
} from "../middlewares/authorValidators.js";

const router = express.Router();

router.post("/", auth, validateCreateAuthor, authorsController.createProfile);
router.get("/me", auth, authorsController.findCurrentUserProfile);
router.put(
  "/me",
  auth,
  validateUpdateAuthor,
  authorsController.updateCurrentUserProfile,
);
router.get("/:penName", authorsController.findProfileByPenName);
export default router;
