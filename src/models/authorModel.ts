import mongoose, { Schema, Document } from "mongoose";

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
    socialLinks: {
      type: {
        website: {
          type: String,
        },
        x: {
          type: String,
        },
        instagram: {
          type: String,
        },
        linkedIn: {
          type: String,
        },
        facebook: {
          type: String,
        },
      },
      default: {
        website: "",
        x: "",
        instagram: "",
        linkedIn: "",
        facebook: "",
      },
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
