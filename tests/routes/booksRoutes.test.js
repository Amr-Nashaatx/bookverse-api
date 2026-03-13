import { describe, test, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { UserModel } from "../../src/models/userModel.js";
import { AuthorModel } from "../../src/models/authorModel.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

let authCookie;
let anotherUserCookie;
let testBook;

beforeAll(async () => {
  const user = await UserModel.create({
    name: "Amr",
    email: "test@test.com",
    password: "pass1234",
  });

  const anotherUser = await UserModel.create({
    name: "Nora",
    email: "nora@test.com",
    password: "pass1234",
  });

  // Create authors for the users
  const author1 = await AuthorModel.create({
    userId: user._id,
    penName: "Amr Author",
    bio: "Test author",
  });

  const author2 = await AuthorModel.create({
    userId: anotherUser._id,
    penName: "Nora Author",
    bio: "Test author",
  });

  // Update users with authorId and role using raw update to bypass validation
  await UserModel.findByIdAndUpdate(user._id, {
    authorId: author1._id,
    role: "author",
  });

  await UserModel.findByIdAndUpdate(anotherUser._id, {
    authorId: author2._id,
    role: "author",
  });

  testBook = {
    title: "The Hobbit",
    genre: "Fantasy",
    description: "A story about three hobbits",
    publishedYear: 1937,
  };

  const token = jwt.sign(
    { userId: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  const anotherToken = jwt.sign(
    {
      userId: anotherUser._id,
      email: anotherUser.email,
      name: anotherUser.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  authCookie = `jwt_token=${token}`;
  anotherUserCookie = `jwt_token=${anotherToken}`;
});

describe("Book Routes ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("POST /api/books should create a book (auth required)", async () => {
    const res = await request(app)
      .post("/api/books")
      .set("Cookie", authCookie)
      .send(testBook);

    expect(res.status).toBe(201);
    expect(res.body.data.book).toMatchObject(testBook);
    expect(res.body.data.book.authorId).toBeDefined();
    expect(res.body.data.book.status).toBe("draft");
  });

  describe("GET /api/books", () => {
    test("returns first page of books with pageInfo", async () => {
      await request(app)
        .post("/api/books")
        .set("Cookie", authCookie)
        .send(testBook);

      const res = await request(app).get("/api/books");

      expect(res.status).toBe(200);

      const { books, pageInfo } = res.body.data;

      expect(books).toHaveLength(1);
      expect(books[0]).toMatchObject(testBook);
      expect(books[0].authorId).toBeDefined();

      expect(pageInfo).toMatchObject({
        hasNextPage: false,
        hasPrevPage: false,
        nextCursor: expect.any(String),
        prevCursor: expect.any(String),
      });
    });

    test("paginates forward using after cursor", async () => {
      const b1 = { ...testBook, title: "AAAAAAAAAAA" };
      const b2 = { ...testBook, title: "BBBBBBBBBB" };
      const b3 = { ...testBook, title: "CCCCCCCCCC" };

      await request(app).post("/api/books").set("Cookie", authCookie).send(b1);
      await request(app).post("/api/books").set("Cookie", authCookie).send(b2);
      await request(app).post("/api/books").set("Cookie", authCookie).send(b3);

      let res = await request(app).get("/api/books?limit=2");
      expect(res.status).toBe(200);

      const { books, pageInfo } = res.body.data;
      expect(books).toHaveLength(2);

      const cursor = pageInfo.nextCursor;
      expect(cursor).toBeTruthy();

      res = await request(app).get(`/api/books?limit=2&after=${cursor}`);
      expect(res.status).toBe(200);

      const page2 = res.body.data.books;
      expect(page2).toHaveLength(1);
      expect(page2[0].title).toBe(b1.title);
    });

    test("paginates backward using before cursor", async () => {
      const b1 = { ...testBook, title: "AAAAAAAAAAA" };
      const b2 = { ...testBook, title: "BBBBBBBBBB" };
      const b3 = { ...testBook, title: "CCCCCCCCCC" };

      await request(app).post("/api/books").set("Cookie", authCookie).send(b1);
      await request(app).post("/api/books").set("Cookie", authCookie).send(b2);
      await request(app).post("/api/books").set("Cookie", authCookie).send(b3);

      let res = await request(app).get("/api/books?limit=2");
      const cursor = res.body.data.pageInfo.nextCursor;

      res = await request(app).get(`/api/books?limit=2&after=${cursor}`);
      const beforeCursor = res.body.data.pageInfo.prevCursor;

      res = await request(app).get(`/api/books?limit=2&before=${beforeCursor}`);
      const { books, pageInfo } = res.body.data;

      expect(pageInfo.hasNextPage).toBe(true);
      expect(pageInfo.hasPrevPage).toBe(false);
      expect(books).toHaveLength(2);
    });

    test("filters by rating range", async () => {
      const b1 = { ...testBook, averageRating: 3 };
      const b2 = { ...testBook, averageRating: 4 };
      const b3 = { ...testBook, averageRating: 5 };

      await request(app).post("/api/books").set("Cookie", authCookie).send(b1);
      await request(app).post("/api/books").set("Cookie", authCookie).send(b2);
      await request(app).post("/api/books").set("Cookie", authCookie).send(b3);

      const res = await request(app).get("/api/books?rating[gte]=4");

      const ratings = res.body.data.books.map((b) => b.averageRating);
      expect(ratings).toEqual(expect.arrayContaining([4, 5]));
      expect(ratings).not.toContain(3);
    });

    test("filters by genre array", async () => {
      const b1 = { ...testBook, genre: "Fantasy" };
      const b2 = { ...testBook, genre: "Sci-Fi" };
      const b3 = { ...testBook, genre: "Horror" };

      await request(app).post("/api/books").set("Cookie", authCookie).send(b1);
      await request(app).post("/api/books").set("Cookie", authCookie).send(b2);
      await request(app).post("/api/books").set("Cookie", authCookie).send(b3);

      const res = await request(app).get(
        "/api/books?genre[]=Fantasy&genre[]=Sci-Fi",
      );

      const genres = res.body.data.books.map((b) => b.genre);

      expect(genres).toEqual(expect.arrayContaining(["Fantasy", "Sci-Fi"]));
      expect(genres).not.toContain("Horror");
    });
  });

  test("GET /api/books/my-books supports status filter and pagination", async () => {
    await request(app)
      .post("/api/books")
      .set("Cookie", authCookie)
      .send({ ...testBook, status: "draft" });

    await request(app)
      .post("/api/books")
      .set("Cookie", authCookie)
      .send({ ...testBook, title: "Published Book", status: "published" });

    const res = await request(app)
      .get("/api/books/my-books?status=published&page=1&limit=10")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.books).toHaveLength(1);
    expect(res.body.data.books[0].status).toBe("published");

    expect(res.body.data.pageInfo).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  test("GET /api/books/:id returns 200 only when status is published", async () => {
    const draftRes = await request(app)
      .post("/api/books")
      .set("Cookie", authCookie)
      .send({ ...testBook, title: "Draft Book", status: "draft" });

    const draftId = draftRes.body.data.book._id;
    const getDraftRes = await request(app).get(`/api/books/${draftId}`);
    expect(getDraftRes.status).toBe(401);

    const publishedRes = await request(app)
      .post("/api/books")
      .set("Cookie", authCookie)
      .send({ ...testBook, title: "Published Book", status: "published" });

    const publishedId = publishedRes.body.data.book._id;
    const getPublishedRes = await request(app).get(`/api/books/${publishedId}`);
    expect(getPublishedRes.status).toBe(200);
    expect(getPublishedRes.body.data.book.title).toBe("Published Book");
  });

  test("PUT /api/books/:id denies updates from non-owner", async () => {
    const createRes = await request(app)
      .post("/api/books")
      .set("Cookie", authCookie)
      .send({ ...testBook, status: "draft" });

    const id = createRes.body.data.book._id;

    const res = await request(app)
      .put(`/api/books/${id}`)
      .set("Cookie", anotherUserCookie)
      .send({ title: "New Title" });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe("fail");
  });

  test("DELETE /api/books/:id removes a book", async () => {
    const createRes = await request(app)
      .post("/api/books")
      .set("Cookie", authCookie)
      .send(testBook);

    const id = createRes.body.data.book._id;

    const res = await request(app)
      .delete(`/api/books/${id}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
  });

  describe("PUT /api/books/:id/status - Update Book Status", () => {
    let bookId;
    let authorId;

    beforeEach(async () => {
      // Create a book for testing
      const res = await request(app)
        .post("/api/books")
        .set("Cookie", authCookie)
        .send(testBook);

      bookId = res.body.data.book._id;
      authorId = res.body.data.book.authorId;

      // Create a chapter for the book so it can transition to preview
      await request(app)
        .post(`/api/books/${bookId}/chapters`)
        .set("Cookie", authCookie)
        .send({
          title: "Chapter 1",
          content:
            "This is test chapter content that is long enough to satisfy the minimum character requirement for the content field",
        });
    });

    test("should reject status update without authentication", async () => {
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .send({ status: "preview" });

      expect(res.status).toBe(401);
    });

    test("should reject status update by non-owner user", async () => {
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", anotherUserCookie)
        .send({ status: "preview" });

      expect(res.status).toBe(401);
    });

    test("should reject invalid status value", async () => {
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "invalid_status" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot transition|Invalid status/i);
    });

    test("should allow DRAFT -> PREVIEW transition", async () => {
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "preview" });

      expect(res.status).toBe(200);
      expect(res.body.data.book.status).toBe("preview");
    });

    test("should reject DRAFT -> PUBLISHED transition", async () => {
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "published" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid status|Cannot transition/i);
    });

    test("should reject DRAFT -> ARCHIVED transition", async () => {
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "archived" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid status|Cannot transition/i);
    });

    test("should allow PREVIEW -> PUBLISHED transition and set publishedAt", async () => {
      // First transition to preview
      await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "preview" });

      // Then transition to published
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "published" });

      expect(res.status).toBe(200);
      expect(res.body.data.book.status).toBe("published");
      expect(res.body.data.book.publishedAt).toBeDefined();
      expect(new Date(res.body.data.book.publishedAt).getTime()).toBeCloseTo(
        Date.now(),
        -2,
      ); // within ~100ms
    });

    test("should allow PREVIEW -> ARCHIVED transition", async () => {
      // First transition to preview
      await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "preview" });

      // Then transition to archived
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "archived" });

      expect(res.status).toBe(200);
      expect(res.body.data.book.status).toBe("archived");
    });

    test("should allow PUBLISHED -> ARCHIVED transition", async () => {
      // Setup: draft -> preview -> published
      await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "preview" });

      await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "published" });

      // Now archive it
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "archived" });

      expect(res.status).toBe(200);
      expect(res.body.data.book.status).toBe("archived");
    });

    test("should reject PUBLISHED -> DRAFT transition (no backward)", async () => {
      // Setup: draft -> preview -> published
      await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "preview" });

      await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "published" });

      // Try to go back to draft
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "draft" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid status|Cannot transition/i);
    });

    test("should reject ARCHIVED -> PREVIEW transition", async () => {
      // Setup: draft -> preview -> archived
      await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "preview" });

      await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "archived" });

      // Try to transition from archived
      const res = await request(app)
        .put(`/api/books/${bookId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "preview" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(
        /Cannot transition|no transitions allowed/i,
      );
    });

    test("should return 401 for non-existent book (security: don't leak book existence)", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/books/${fakeId}/status`)
        .set("Cookie", authCookie)
        .send({ status: "preview" });

      expect(res.status).toBe(401);
    });
  });
});
