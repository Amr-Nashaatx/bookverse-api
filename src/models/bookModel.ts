import mongoose, { Schema, Document, mongo } from "mongoose";

export interface Book {
  title: string;
  authorId: Schema.Types.ObjectId | mongoose.Types.ObjectId;
  chapters: Schema.Types.ObjectId[];
  genre: string;
  isbn?: string;
  publishedYear: number;
  averageRating?: number;
  description?: string;
  coverImage?: string;
  createdAt: Date;
  createdBy: Schema.Types.ObjectId | mongoose.Types.ObjectId;
  updatedAt: Date;
  status: string;
}

interface BookDoc extends Book {}
interface BookDoc extends Document {}

const bookSchema = new Schema<BookDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    genre: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
    },
    chapters: {
      type: [Schema.Types.ObjectId],
      ref: "Chapter",
    },
    status: {
      type: String,
      enum: ["draft", "preview", "published", "archived"],
      default: "draft",
    },
    publishedYear: {
      type: Number,
      required: true,
      min: 1450,
      max: new Date().getFullYear(),
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
    },
    description: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

bookSchema.index({ genre: 1 });
bookSchema.index({ averageRating: -1 });
bookSchema.index({ publishedYear: -1 });
bookSchema.index({ title: "text", description: "text" });

export const BookModel = mongoose.model<BookDoc>("Book", bookSchema);
