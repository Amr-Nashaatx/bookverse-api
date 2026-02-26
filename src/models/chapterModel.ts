import mongoose, { Schema, Document } from "mongoose";

interface IChapter extends Document {}

const chapterSchema = new Schema<IChapter>({}, { timestamps: true });

export const ChapterModel = mongoose.model("Author", chapterSchema);
