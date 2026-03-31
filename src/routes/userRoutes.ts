import express, { Router } from "express";
import * as usersController from "../controllers/userController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router: Router = express.Router();

router.get("/me", auth, usersController.me);
router.put("/:id", auth, usersController.updateUser);
router.post(
  "/upload-avatar",
  auth,
  upload.single("avatar"),
  usersController.uploadAvatar,
);

export default router;
