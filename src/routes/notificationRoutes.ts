import express from "express";
import {
  fetchUnread,
  markRead,
  stream,
} from "../controllers/notificationController.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/stream", auth, stream);
router.get("/", auth, fetchUnread);
router.patch("/:id/read", auth, markRead);

export default router;
