import mongoose, { Document, Schema } from "mongoose";

export interface IPreviewShare extends Document {
  bookId: mongoose.Types.ObjectId; // ref Book
  userId: mongoose.Types.ObjectId; // ref User
  sharedBy: mongoose.Types.ObjectId; // author user id
  createdAt: Date;
  revokedAt?: Date;
  expiresAt?: Date;
}

const previewShareSchema = new Schema<IPreviewShare>(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    revokedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

previewShareSchema.index({ bookId: 1, userId: 1 }, { unique: true });

export const PreviewShareModel = mongoose.model<IPreviewShare>(
  "PreviewShare",
  previewShareSchema,
);
