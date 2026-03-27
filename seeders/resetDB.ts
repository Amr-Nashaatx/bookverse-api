import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

dotenv.config();

async function resetDatabase() {
  await connectDB("mongodb://localhost:27017/book-review");

  const collections = Object.values(mongoose.connection.collections);

  for (const collection of collections) {
    await collection.deleteMany({});
  }

  console.log(`Cleared ${collections.length} collections.`);
  await mongoose.disconnect();
}

resetDatabase().catch(async (error) => {
  console.error("Failed to reset database.");
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
