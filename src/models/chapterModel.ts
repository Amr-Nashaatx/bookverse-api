import mongoose, { Document, UpdateQuery, Query, Schema } from "mongoose";

export interface IChapter extends Document {
  bookId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  order: number;
  status: "draft" | "published";
  wordCount: number;
  editedAt?: Date;
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
      type: String,
      required: true,
      trim: true,
      minlength: 100,
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

function calculateWordCount(content: string): number {
  const words = content.trim().match(/\S+/g);
  return words ? words.length : 0;
}

chapterSchema.pre("save", function (next) {
  this.wordCount = calculateWordCount(this.content || "");
  next();
});

chapterSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function (this: Query<any, IChapter>, next) {
    const update = this.getUpdate() as UpdateQuery<IChapter>;

    if (!update) {
      return next();
    }
    const directContent =
      typeof update.content === "string" ? update.content : undefined;
    const set = update.$set as Record<string, unknown> | undefined;
    const setContent =
      typeof set?.content === "string" ? set.content : undefined;
    const content = directContent ?? setContent;

    if (typeof content === "string") {
      this.setUpdate({
        ...update,
        $set: {
          ...(set || {}),
          content,
          wordCount: calculateWordCount(content),
        },
      });
    }

    next();
  },
);

chapterSchema.index({ bookId: 1, order: 1 }, { unique: true });

export const ChapterModel = mongoose.model<IChapter>("Chapter", chapterSchema);
