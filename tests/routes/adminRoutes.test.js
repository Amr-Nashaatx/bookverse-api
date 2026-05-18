import { beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { UserModel } from "../../src/models/userModel.js";
import { AuthorModel } from "../../src/models/authorModel.js";
import { BookModel } from "../../src/models/bookModel.js";

let adminCookie;
let authorCookie;
let sequence = 0;

const testBook = {
  title: "Moderation Test Book",
  genre: "Fantasy",
  description: "A book used to test the admin moderation workflow",
  publishedYear: 2024,
};

const chapterPayload = {
  title: "Chapter 1",
  content:
    "This chapter is long enough to satisfy the review readiness checks and should make the book eligible for moderation.",
};

beforeAll(async () => {
  const admin = await UserModel.create({
    name: "Admin",
    email: "admin@test.com",
    password: "pass1234",
    role: "admin",
  });

  const authorUser = await UserModel.create({
    name: "Author User",
    email: "author@test.com",
    password: "pass1234",
  });

  const author = await AuthorModel.create({
    userId: authorUser._id,
    penName: "Author Pen",
    bio: "Author bio",
  });

  await UserModel.findByIdAndUpdate(authorUser._id, {
    authorId: author._id,
    role: "author",
  });

  adminCookie = `jwt_token=${jwt.sign(
    { userId: admin._id, email: admin.email, name: admin.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  )}`;

  authorCookie = `jwt_token=${jwt.sign(
    { userId: authorUser._id, email: authorUser.email, name: authorUser.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  )}`;
});

const createPendingAuthor = async (suffix) => {
  sequence += 1;
  const id = suffix ?? `${sequence}`;
  const user = await UserModel.create({
    name: `Author ${id}`,
    email: `pending-author-${id}@test.com`,
    password: "pass1234",
  });

  const author = await AuthorModel.create({
    userId: user._id,
    penName: `pending-author-${id}`,
    bio: `Bio ${id}`,
    status: "pending",
  });

  await UserModel.findByIdAndUpdate(user._id, {
    authorId: author._id,
    role: "author",
  });

  const cookie = `jwt_token=${jwt.sign(
    { userId: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  )}`;

  return { user, author, cookie };
};

const createDraftBook = async () => {
  const createRes = await request(app)
    .post("/api/books")
    .set("Cookie", authorCookie)
    .send(testBook);

  const bookId = createRes.body.data.book._id;

  await request(app)
    .post(`/api/books/${bookId}/chapters`)
    .set("Cookie", authorCookie)
    .send(chapterPayload);

  return bookId;
};

describe("Admin author moderation routes", () => {
  test("POST /api/admin/authors/:id/approve updates author status", async () => {
    const { author } = await createPendingAuthor("approve");

    const res = await request(app)
      .post(`/api/admin/authors/${author._id}/approve`)
      .set("Cookie", adminCookie)
      .send({});

    expect(res.status).toBe(204);

    const updatedAuthor = await AuthorModel.findById(author._id).lean();
    expect(updatedAuthor?.status).toBe("approved");
  });

  test("POST /api/admin/authors/:id/reject updates author status and rejection reason", async () => {
    const { author } = await createPendingAuthor("reject");

    const res = await request(app)
      .post(`/api/admin/authors/${author._id}/reject`)
      .set("Cookie", adminCookie)
      .send({ rejectionReason: "Application needs more detail" });

    expect(res.status).toBe(204);

    const updatedAuthor = await AuthorModel.findById(author._id).lean();
    expect(updatedAuthor?.status).toBe("rejected");
    expect(updatedAuthor?.rejectionReason).toBe("Application needs more detail");
  });

  test("GET /api/admin/authors filters authors by status and name", async () => {
    await createPendingAuthor("list-pending");
    const { author: approvedAuthor } = await createPendingAuthor("list-approved");
    await AuthorModel.findByIdAndUpdate(approvedAuthor._id, { status: "approved" });

    const res = await request(app)
      .get(`/api/admin/authors?status=approved&name=${approvedAuthor.penName}`)
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.authors).toHaveLength(1);
    expect(res.body.data.authors[0].status).toBe("approved");
    expect(res.body.data.authors[0].penName).toBe(approvedAuthor.penName);
  });

  test("author users cannot moderate authors", async () => {
    const { author } = await createPendingAuthor("forbidden-author");

    const res = await request(app)
      .post(`/api/admin/authors/${author._id}/approve`)
      .set("Cookie", authorCookie)
      .send({});

    expect(res.status).toBe(403);
  });
});

describe("Admin book moderation routes", () => {
  test("GET /api/admin/books filters books by status", async () => {
    const draftBookId = await createDraftBook();
    const publishedBookId = await createDraftBook();

    await request(app)
      .put(`/api/books/${publishedBookId}/status`)
      .set("Cookie", authorCookie)
      .send({ status: "published" });

    const res = await request(app)
      .get("/api/admin/books?status=published")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.books.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.books.every((book) => book.status === "published")).toBe(true);
    expect(res.body.data.books.some((book) => book._id === publishedBookId)).toBe(true);
    expect(res.body.data.books.some((book) => book._id === draftBookId)).toBe(false);
  });

  test("author users cannot moderate books through admin routes", async () => {
    const bookId = await createDraftBook();

    await request(app)
      .post(`/api/books/${bookId}/submit-for-review`)
      .set("Cookie", authorCookie);

    const res = await request(app)
      .post(`/api/admin/books/${bookId}/approve-publish`)
      .set("Cookie", authorCookie)
      .send({});

    expect(res.status).toBe(403);
  });

  test("POST /api/admin/books/:id/approve-publish publishes a requested draft", async () => {
    const bookId = await createDraftBook();

    await request(app)
      .post(`/api/books/${bookId}/submit-for-review`)
      .set("Cookie", authorCookie);

    const res = await request(app)
      .post(`/api/admin/books/${bookId}/approve-publish`)
      .set("Cookie", adminCookie)
      .send({});

    expect(res.status).toBe(204);

    const book = await BookModel.findById(bookId).lean();
    expect(book?.status).toBe("published");
    expect(book?.publishedAt).toBeDefined();
    expect(book?.reviewRequest).toBeFalsy();
  });

  test("POST /api/admin/books/:id/reject-publish records the rejection details", async () => {
    const bookId = await createDraftBook();

    await request(app)
      .post(`/api/books/${bookId}/submit-for-review`)
      .set("Cookie", authorCookie);

    const res = await request(app)
      .post(`/api/admin/books/${bookId}/reject-publish`)
      .set("Cookie", adminCookie)
      .send({ rejectionReason: "Needs stronger opening chapter" });

    expect(res.status).toBe(204);

    const book = await BookModel.findById(bookId).lean();
    expect(book?.status).toBe("draft");
    expect(book?.reviewRequest?.reviewedAt).toBeDefined();
    expect(book?.reviewRequest?.rejectionReason).toBe("Needs stronger opening chapter");
  });

  test("POST /api/admin/books/:id/approve-archive archives a requested published book", async () => {
    const bookId = await createDraftBook();

    await request(app)
      .put(`/api/books/${bookId}/status`)
      .set("Cookie", authorCookie)
      .send({ status: "published" });

    await request(app)
      .post(`/api/books/${bookId}/request-archive`)
      .set("Cookie", authorCookie);

    const res = await request(app)
      .post(`/api/admin/books/${bookId}/approve-archive`)
      .set("Cookie", adminCookie)
      .send({});

    expect(res.status).toBe(204);

    const book = await BookModel.findById(bookId).lean();
    expect(book?.status).toBe("archived");
    expect(book?.reviewRequest).toBeFalsy();
  });

  test("POST /api/admin/books/:id/reject-archive keeps the book published and records the rejection", async () => {
    const bookId = await createDraftBook();

    await request(app)
      .put(`/api/books/${bookId}/status`)
      .set("Cookie", authorCookie)
      .send({ status: "published" });

    await request(app)
      .post(`/api/books/${bookId}/request-archive`)
      .set("Cookie", authorCookie);

    const res = await request(app)
      .post(`/api/admin/books/${bookId}/reject-archive`)
      .set("Cookie", adminCookie)
      .send({ rejectionReason: "Keep this one live for now" });

    expect(res.status).toBe(204);

    const book = await BookModel.findById(bookId).lean();
    expect(book?.status).toBe("published");
    expect(book?.reviewRequest?.reviewedAt).toBeDefined();
    expect(book?.reviewRequest?.rejectionReason).toBe("Keep this one live for now");
  });
});
