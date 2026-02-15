import express, { Router } from "express";
import * as usersController from "../controllers/userController.js";
import { auth } from "../middlewares/authMiddleware.js";

const router: Router = express.Router();

router.get("/me", auth, usersController.me);
router.put("/:id", auth, usersController.updateUser);

export default router;
