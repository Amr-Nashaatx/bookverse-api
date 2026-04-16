import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import dotenve from "dotenv";
import { beforeEach } from "vitest";

dotenve.config();
let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (key === "users" || key === "authors") continue;
    await collections[key].deleteMany();
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});
