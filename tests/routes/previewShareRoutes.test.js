import { describe, expect, test, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { UserModel } from "../../src/models/userModel.js";

vi.mock("../../src/services/previewService.js", () => ({
  generateBookPreview: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4")),
}));

const api = request(app);

let sequence = 0;

const longContent = (label = "chapter") => `${label} ` + "word ".repeat(120);

const createRegisteredUser = async (prefix = "user") => {
  sequence += 1;
  const email = `${prefix}-${sequence}@test.com`;
  const registerRes = await api.post("/api/auth/register").send({
    name: `u${sequence}`.padEnd(3, "x").slice(0, 10),
    email,
    password: "pass1234",
  });

  expect(registerRes.status).toBe(201);
  const user = await UserModel.findOne({ email });
  return {
    cookie: registerRes.headers["set-cookie"],
    user,
  };
};

const createAuthorUser = async (prefix = "author") => {
  const { cookie, user } = await createRegisteredUser(prefix);
  const authorRes = await api.post("/api/authors").set("Cookie", cookie).send({
    penName: `${prefix}-pen-${sequence}`,
    bio: "author bio",
  });

  expect(authorRes.status).toBe(201);
  const updatedUser = await UserModel.findById(user._id);
  return { cookie, user: updatedUser };
};

const createPreviewBook = async (cookie, overrides = {}) => {
  const bookRes = await api
    .post("/api/books")
    .set("Cookie", cookie)
    .send({
      title: `Preview Book ${sequence}`,
      genre: "Fantasy",
      description: "A test description",
      publishedYear: 2020,
      ...overrides,
    });
  expect(bookRes.status).toBe(201);
  const book = bookRes.body.data.book;

  const chapterRes = await api
    .post(`/api/books/${book._id}/chapters`)
    .set("Cookie", cookie)
    .send({
      title: "Chapter 1",
      content: longContent("preview"),
    });
  expect(chapterRes.status).toBe(201);

  const statusRes = await api
    .put(`/api/books/${book._id}/status`)
    .set("Cookie", cookie)
    .send({ status: "preview" });
  expect(statusRes.status).toBe(200);

  return statusRes.body.data.book;
};

describe("Preview share routes", () => {
  test("author can create and fetch a preview share for a specific user", async () => {
    const { cookie: authorCookie } = await createAuthorUser("preview-owner");
    const { cookie: readerCookie, user: reader } =
      await createRegisteredUser("preview-reader");
    const book = await createPreviewBook(authorCookie);

    const createRes = await api
      .post(`/api/preview-share/${book._id}`)
      .set("Cookie", authorCookie)
      .send({ email: reader.email, duration: 60000, durationMs: 60000 });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.previewShare).toMatchObject({
      bookId: book._id,
      userId: reader._id.toString(),
    });
    expect(createRes.body.data.previewShare.expiresAt).toBeTruthy();

    const shareId = createRes.body.data.previewShare._id;
    const readerGetRes = await api
      .get(`/api/preview-share/${shareId}`)
      .set("Cookie", readerCookie);

    expect(readerGetRes.status).toBe(200);
    expect(readerGetRes.headers["content-type"]).toContain("application/pdf");
  });

  test("rejects shares for non-preview books and duplicate preview shares", async () => {
    const { cookie: authorCookie } = await createAuthorUser("preview-guard");
    const { user: reader } = await createRegisteredUser("preview-guard-reader");

    const draftRes = await api
      .post("/api/books")
      .set("Cookie", authorCookie)
      .send({
        title: "Draft Share",
        genre: "Fantasy",
        description: "A test description",
        publishedYear: 2020,
      });
    expect(draftRes.status).toBe(201);

    const draftShareRes = await api
      .post(`/api/preview-share/${draftRes.body.data.book._id}`)
      .set("Cookie", authorCookie)
      .send({ email: reader.email, duration: 60000, durationMs: 60000 });
    expect(draftShareRes.status).toBe(400);

    const book = await createPreviewBook(authorCookie, {
      title: "Duplicate Share",
    });
    const firstShareRes = await api
      .post(`/api/preview-share/${book._id}`)
      .set("Cookie", authorCookie)
      .send({ email: reader.email, duration: 60000, durationMs: 60000 });
    expect(firstShareRes.status).toBe(201);

    const duplicateShareRes = await api
      .post(`/api/preview-share/${book._id}`)
      .set("Cookie", authorCookie)
      .send({ email: reader.email, duration: 60000, durationMs: 60000 });
    expect(duplicateShareRes.status).toBe(400);
  });

  test("prevents non-owners from creating, reading, or deleting another author's share", async () => {
    const { cookie: ownerCookie } = await createAuthorUser("preview-owner-auth");
    const { cookie: otherAuthorCookie, user: otherAuthor } =
      await createAuthorUser("preview-other-auth");
    const { cookie: readerCookie, user: reader } =
      await createRegisteredUser("preview-shared-reader");
    const book = await createPreviewBook(ownerCookie);

    const nonOwnerCreateRes = await api
      .post(`/api/preview-share/${book._id}`)
      .set("Cookie", otherAuthorCookie)
      .send({ email: otherAuthor.email, duration: 60000, durationMs: 60000 });
    expect(nonOwnerCreateRes.status).toBe(401);

    const createRes = await api
      .post(`/api/preview-share/${book._id}`)
      .set("Cookie", ownerCookie)
      .send({ email: reader.email, duration: 60000, durationMs: 60000 });
    expect(createRes.status).toBe(201);
    const shareId = createRes.body.data.previewShare._id;

    const nonOwnerGetRes = await api
      .get(`/api/preview-share/${shareId}`)
      .set("Cookie", otherAuthorCookie);
    expect(nonOwnerGetRes.status).toBe(401);

    const readerDeleteRes = await api
      .delete(`/api/preview-share/${shareId}`)
      .set("Cookie", readerCookie);
    expect(readerDeleteRes.status).toBe(401);

    const ownerDeleteRes = await api
      .delete(`/api/preview-share/${shareId}`)
      .set("Cookie", ownerCookie);
    expect(ownerDeleteRes.status).toBe(200);
    expect(ownerDeleteRes.body.data.previewShare._id).toBe(shareId);
  });
});
