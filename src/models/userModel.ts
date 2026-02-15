import mongoose, { Schema, Document } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin" | "author";
  avatar: string;
  isAuthor: boolean;
  createdAt: Date;
  updatedAt: Date;
  _id: mongoose.Types.ObjectId;
}
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      maxLength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minLength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    isAuthor: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      validate: [validator.isURL, "avatar must be a valid URL"],
    },
    role: {
      type: String,
      enum: ["user", "admin", "author"],
      default: "user",
    },
  },
  { timestamps: true },
);

userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const UserModel = mongoose.model<IUser>("User", userSchema);
