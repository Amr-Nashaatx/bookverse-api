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

const extractText = (content: unknown): string => {
  if (!content) return "";
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      return extractText(parsed);
    } catch {
      return content;
    }
  }
  if (Array.isArray(content)) {
    return content.map(extractText).join(" ");
  }
  if (typeof content === "object") {
    return Object.values(content as Record<string, unknown>)
      .map(extractText)
      .join(" ");
  }
  return "";
};

const countWords = (content: unknown): number => {
  const text = extractText(content).trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
};

chapterSchema.pre("save", function (next) {
  if (this.isModified("content")) {
    this.wordCount = countWords(this.content);
  }
  next();
});

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
    const setWordCount = set?.wordCount;
    const content = directContent ?? setContent;

    if (content !== undefined) {
      const nextWordCount = wordCount ?? setWordCount ?? countWords(content);
      this.setUpdate({
        ...update,
        $set: {
          ...(set || {}),
          content,
          wordCount: nextWordCount,
        },
      });
    }

    next();
  },
);

export const ChapterModel = mongoose.model<IChapter>("Chapter", chapterSchema);
