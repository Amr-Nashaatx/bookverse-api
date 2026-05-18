import { Router } from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/isAdminMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import {
    validateApproveAuthor,
    validateListAuthors,
    validateListBooks,
    validateModerateBookRequest,
    validateRejectAuthor,
} from "../middlewares/adminValidators.js";

const router = Router();

// Author moderation routes
router.post("/authors/:id/approve", auth, isAdmin, validateApproveAuthor, adminController.approveAuthor);
router.post("/authors/:id/reject", auth, isAdmin, validateRejectAuthor, adminController.rejectAuthor);
router.get("/authors", auth, isAdmin, validateListAuthors, adminController.listAuthors);

// Book moderation routes
router.post("/books/:id/approve-publish", auth, isAdmin, validateModerateBookRequest, adminController.approvePublish);
router.post("/books/:id/reject-publish", auth, isAdmin, validateModerateBookRequest, adminController.rejectPublish);
router.post("/books/:id/approve-archive", auth, isAdmin, validateModerateBookRequest, adminController.approveArchive);
router.post("/books/:id/reject-archive", auth, isAdmin, validateModerateBookRequest, adminController.rejectArchive);
router.get("/books/", auth, isAdmin, validateListBooks, adminController.listBooks);
export default router;
