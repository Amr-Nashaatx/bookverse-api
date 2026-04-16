import "./types/index.js";
import express, { Application } from "express";

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import shelfRoutes from "./routes/shelfRoutes.js";
import authorRoutes from "./routes/authorRoutes.js";
import previewShareRoutes from "./routes/previewShareRoutes.js";
import notificationsRoutes from "./routes/notificationRoutes.js";

import devAuth from "./routes/dev/devAuth.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();
const app: Application = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());

if (
  process.env.ENABLE_DEV_AUTH === "true" &&
  process.env.NODE_ENV !== "production"
) {
  app.use("/api/dev/auth", devAuth);
}

app.use("/api/notifications", notificationsRoutes);
app.use("/api/preview-share", previewShareRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/shelves", shelfRoutes);
app.use("/api/authors", authorRoutes);

app.use(errorHandler);

export default app;
