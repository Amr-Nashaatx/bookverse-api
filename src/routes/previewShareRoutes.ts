import express from "express";
import * as previewShareController from "../controllers/previewShareController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { previewShareCreateValidator } from "../middlewares/previewShareValidators.js";

const router = express.Router();

router.get("/:shareId", auth, previewShareController.findById);

router.delete("/:shareId", auth, previewShareController.deleteById);

router.post(
  "/:bookId",
  auth,
  previewShareCreateValidator,
  previewShareController.create,
);

export default router;
