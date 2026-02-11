import mongoose, { Schema, Document } from "mongoose";
import validator from "validator";

interface SocialLinks {
  website?: string;
  x?: string;
  instagram?: string;
  linkedIn?: string;
  facebook?: string;
}
interface IAuthor extends Document {
  penName: string;
  bio?: string;
  avatar?: string;
  socialLinks?: SocialLinks;
  userId: mongoose.Types.ObjectId;
  isVerified: boolean;
  status: string;
}

const authorSchema = new Schema<IAuthor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    penName: {
      type: String,
      unique: true,
      required: [true, "Please provide a name"],
      trim: true,
      maxLength: [100, "Name cannot exceed 100 characters"],
      minLength: [2, "Name cannot be lower than 2 characters"],
    },
    bio: {
      type: String,
      trim: true,
      maxLength: [500, "Bio should not exceed 500 characters"],
    },
    avatar: {
      type: String,
      validate: [validator.isURL, "avatar should be a url"],
    },
    socialLinks: {
      type: {
        website: {
          type: String,
          validate: [validator.isURL, "website should be a url"],
        },
        x: {
          type: String,
          validate: [validator.isURL, "x should be a url"],
        },
        instagram: {
          type: String,
          validate: [validator.isURL, "instagram should be a url"],
        },
        linkedIn: {
          type: String,
          validate: [validator.isURL, "linkedIn should be a url"],
        },
        facebook: {
          type: String,
          validate: [validator.isURL, "facebook should be a url"],
        },
      },
      default: {},
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const AuthorModel = mongoose.model("Author", authorSchema);
