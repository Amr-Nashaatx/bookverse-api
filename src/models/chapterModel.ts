import mongoose, { Document, UpdateQuery, Query, Schema } from "mongoose";

export interface IChapter extends Document {
  bookId: mongoose.Types.ObjectId;
  title: string;
  content?: any;
  status: "draft" | "published";
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const chapterSchema = new Schema<IChapter>(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    content: {
      type: Schema.Types.Mixed,
      required: false,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

chapterSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function (this: Query<any, IChapter>, next) {
    const update = this.getUpdate() as UpdateQuery<IChapter>;

    if (!update) {
      return next();
    }
    const directContent = update.content;
    const wordCount = update.wordCount;
    const set = update.$set as Record<string, unknown> | undefined;
    const setContent = set?.content;
    const content = directContent ?? setContent;

    if (content !== undefined) {
      this.setUpdate({
        ...update,
        $set: {
          ...(set || {}),
          content,
          wordCount: wordCount ?? -1,
        },
      });
    }

    next();
  },
);

export const ChapterModel = mongoose.model<IChapter>("Chapter", chapterSchema);
