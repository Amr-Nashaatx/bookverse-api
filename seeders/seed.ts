import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { UserModel } from "../src/models/userModel.js";
import { AuthorModel } from "../src/models/authorModel.js";
import { BookModel } from "../src/models/bookModel.js";
import { ChapterModel } from "../src/models/chapterModel.js";
import { ReviewModel } from "../src/models/reviewModel.js";
import { ShelfModel } from "../src/models/shelfModel.js";
import { generateSeedData } from "./seedData.js";

dotenv.config();

async function hashPasswords(passwords: string[]) {
  const uniquePasswords = [...new Set(passwords)];
  const hashedEntries = await Promise.all(
    uniquePasswords.map(
      async (password) => [password, await bcrypt.hash(password, 10)] as const,
    ),
  );

  return new Map(hashedEntries);
}

async function seedDatabase() {
  const seed = generateSeedData();
  const passwordMap = await hashPasswords(
    seed.users.map((user) => user.password),
  );

  await connectDB("mongodb://localhost:27017/book-review");

  const existingCollections = Object.values(mongoose.connection.collections);
  for (const collection of existingCollections) {
    await collection.deleteMany({});
  }

  await AuthorModel.insertMany(seed.authors);
  await UserModel.insertMany(
    seed.users.map((user) => ({
      ...user,
      password: passwordMap.get(user.password)!,
    })),
  );
  await BookModel.insertMany(seed.books);
  await ChapterModel.insertMany(seed.chapters);
  await ReviewModel.insertMany(seed.reviews);
  await ShelfModel.insertMany(seed.shelves);

  console.log("Seed completed successfully.");
  console.log(
    JSON.stringify(
      {
        users: seed.users.length,
        authors: seed.authors.length,
        books: seed.books.length,
        chapters: seed.chapters.length,
        reviews: seed.reviews.length,
        shelves: seed.shelves.length,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

seedDatabase().catch(async (error) => {
  console.error("Failed to seed database.");
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
