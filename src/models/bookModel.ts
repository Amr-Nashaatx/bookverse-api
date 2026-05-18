import mongoose, { Schema, Document, mongo } from "mongoose";

export interface ReviewRequest {
  requestedStatus: "published" | "archived";
  requestedBy: mongoose.Types.ObjectId;
  requestedAt: Date;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
}
export interface Book {
  _id: mongoose.Types.ObjectId;
  title: string;
  authorId: Schema.Types.ObjectId | mongoose.Types.ObjectId;
  chapters: Schema.Types.ObjectId[];
  genre: string;
  isbn?: string;
  publishedYear: number;
  averageRating?: number;
  description?: string;
  coverImage?: string;
  createdBy: Schema.Types.ObjectId | mongoose.Types.ObjectId;
  status: string;
  publishedAt: Date;
  reviewRequest?: ReviewRequest;
}

interface BookDoc extends Book {}
interface BookDoc extends Document<mongoose.Types.ObjectId> {}

const reviewRequestSchema = new Schema<ReviewRequest>(
  {
    requestedStatus: { type: String, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedAt: { type: Date, required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
  },
  { _id: false },
);

const bookSchema = new Schema<BookDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "Author",
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
      default: Date.now(),
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    description: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    publishedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    reviewRequest: {
      type: reviewRequestSchema,
      default: undefined,
    },
  },
  { timestamps: true },
);

bookSchema.index({ genre: 1 });
bookSchema.index({ averageRating: -1 });
bookSchema.index({ publishedYear: -1 });
bookSchema.index({ title: "text", description: "text" });

export const BookModel = mongoose.model<BookDoc>("Book", bookSchema);
