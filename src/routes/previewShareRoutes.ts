import express from "express";
import * as previewShareController from "../controllers/previewShareController.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:shareId", auth, previewShareController.findById);

router.delete("/:shareId", auth, previewShareController.deleteById);

router.post("/:bookId", auth, previewShareController.create);

export default router;
