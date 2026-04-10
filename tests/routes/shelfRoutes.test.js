import { describe, test, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { UserModel } from "../../src/models/userModel.js";
import { BookModel } from "../../src/models/bookModel.js";
import { ShelfModel } from "../../src/models/shelfModel.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

let authCookie;
let testBook;
let testUser;
let testAuthorId;

beforeAll(async () => {
  testUser = await UserModel.create({
    name: "Shelf Tester",
    email: "shelftester@test.com",
    password: "pass1234",
  });
  testAuthorId = new mongoose.Types.ObjectId();

  const token = jwt.sign(
    { userId: testUser._id, email: testUser.email, name: testUser.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  authCookie = `jwt_token=${token}`;
});

describe("Shelf Routes", () => {
  beforeEach(async () => {
    // Clean up shelves before each test to ensure isolation
    await ShelfModel.deleteMany({ user: testUser._id });

    testBook = await BookModel.create({
      title: "Shelf Test Book",
      authorId: testAuthorId,
      genre: "Testing",
      description: "A book for testing shelves",
      createdBy: testUser._id,
      publishedYear: 2023,
    });
  });

  test("POST /api/shelves should create a new shelf", async () => {
    const shelfData = {
      name: "My New Shelf",
      description: "A cool shelf",
    };

    const res = await request(app)
      .post("/api/shelves")
      .set("Cookie", authCookie)
      .send(shelfData);

    expect(res.status).toBe(201);
    expect(res.body.data.shelf).toMatchObject({
      name: shelfData.name,
      description: shelfData.description,
      user: testUser._id.toString(),
    });
  });

  test("GET /api/shelves should return all shelves for the user", async () => {
    await ShelfModel.create({
      user: testUser._id,
      name: "Shelf 1",
    });
    await ShelfModel.create({
      user: testUser._id,
      name: "Shelf 2",
    });

    const res = await request(app)
      .get("/api/shelves")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.shelves).toHaveLength(2);
    expect(res.body.data.shelves[0].booksCount).toBeDefined();
    expect(res.body.data.shelves.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Shelf 1", "Shelf 2"])
    );
  });

  test("GET /api/shelves/:id should return a specific shelf", async () => {
    const shelf = await ShelfModel.create({
      user: testUser._id,
      name: "Specific Shelf",
    });

    const res = await request(app)
      .get(`/api/shelves/${shelf._id}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.shelf.name).toBe("Specific Shelf");
  });

  test("PUT /api/shelves/:id should update a shelf", async () => {
    const shelf = await ShelfModel.create({
      user: testUser._id,
      name: "Old Name",
    });

    const res = await request(app)
      .put(`/api/shelves/${shelf._id}`)
      .set("Cookie", authCookie)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.shelf.name).toBe("New Name");
  });

  test("DELETE /api/shelves/:id should delete a shelf", async () => {
    const shelf = await ShelfModel.create({
      user: testUser._id,
      name: "To Delete",
    });

    const res = await request(app)
      .delete(`/api/shelves/${shelf._id}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);

    const deletedShelf = await ShelfModel.findById(shelf._id);
    expect(deletedShelf).toBeNull();
  });

  test("POST /api/shelves/:id/books should add a book to a shelf", async () => {
    const shelf = await ShelfModel.create({
      user: testUser._id,
      name: "Book Shelf",
    });

    const res = await request(app)
      .post(`/api/shelves/${shelf._id}/books`)
      .set("Cookie", authCookie)
      .send({ bookId: testBook._id });

    expect(res.status).toBe(200);
    expect(res.body.data.shelf.books).toHaveLength(1);
    expect(res.body.data.shelf.books[0]).toBe(testBook._id.toString());
  });

  test("DELETE /api/shelves/:id/books/:bookId should remove a book from a shelf", async () => {
    const shelf = await ShelfModel.create({
      user: testUser._id,
      name: "Remove Book Shelf",
      books: [testBook._id],
    });

    const res = await request(app)
      .delete(`/api/shelves/${shelf._id}/books/${testBook._id}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.shelf.books).toHaveLength(0);
  });
});
