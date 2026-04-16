import { describe, expect, test } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { UserModel } from "../../src/models/userModel.js";
import { ChapterModel } from "../../src/models/chapterModel.js";
import { BookModel } from "../../src/models/bookModel.js";

const api = request(app);

let sequence = 0;

const longContent = (label = "chapter") => `${label} ` + "word ".repeat(120);

const createRegisteredUser = async (prefix = "user") => {
  sequence += 1;
  const email = `${prefix}-${sequence}@test.com`;
  const shortName = `u${sequence}`.padEnd(3, "x").slice(0, 10);
  const registerRes = await api.post("/api/auth/register").send({
    name: shortName,
    email,
    password: "pass1234",
  });

  return {
    email,
    cookie: registerRes.headers["set-cookie"],
  };
};

const createAuthorUser = async (prefix = "author") => {
  const { email, cookie } = await createRegisteredUser(prefix);
  const penName = `${prefix}-pen-${sequence}`;

  const authorRes = await api.post("/api/authors").set("Cookie", cookie).send({
    penName,
    bio: "author bio",
  });

  expect(authorRes.status).toBe(201);
  const user = await UserModel.findOne({ email });

  return { cookie, user };
};

const createAdminUser = async (prefix = "admin") => {
  const { email, cookie } = await createRegisteredUser(prefix);
  const user = await UserModel.findOne({ email });
  await UserModel.findByIdAndUpdate(user._id, { role: "admin" });
  const updatedUser = await UserModel.findById(user._id);
  return { cookie, user: updatedUser };
};

const createBookAsAuthor = async (cookie, overrides = {}) => {
  const payload = {
    title: `Book ${sequence}`,
    genre: "Fantasy",
    description: "A test description",
    publishedYear: 2020,
    ...overrides,
  };

  const res = await api.post("/api/books").set("Cookie", cookie).send(payload);
  expect(res.status).toBe(201);
  return res.body.data.book;
};

const createChapter = async (cookie, bookId, payload = {}) => {
  const chapterPayload = {
    title: "Chapter 1",
    content: longContent("chapter-1"),
    ...payload,
  };

  return api
    .post(`/api/books/${bookId}/chapters`)
    .set("Cookie", cookie)
    .send(chapterPayload);
};

describe("Chapter routes", () => {
  test("POST /api/books/:bookId/chapters creates chapter for owner/admin and validates payload", async () => {
    const { cookie: ownerCookie } = await createAuthorUser("owner-create");
    const { cookie: adminCookie } = await createAdminUser("admin-create");
    const { cookie: strangerCookie } =
      await createAuthorUser("stranger-create");
    const book = await createBookAsAuthor(ownerCookie);

    const ownerRes = await createChapter(ownerCookie, book._id, {
      title: "Owner Chapter",
    });

    expect(ownerRes.status).toBe(201);
    expect(ownerRes.body.status).toBe("success");
    expect(ownerRes.body.data.chapter).toMatchObject({
      bookId: book._id,
      title: "Owner Chapter",
      status: "draft",
    });
    expect(ownerRes.body.data.chapter.wordCount).toBeGreaterThan(0);
    expect(ownerRes.body.data.chapter.createdAt).toBeDefined();

    const adminRes = await createChapter(adminCookie, book._id, {
      title: "Admin Chapter",
    });
    expect(adminRes.status).toBe(201);

    const strangerRes = await createChapter(strangerCookie, book._id, {
      title: "No Access",
    });
    expect(strangerRes.status).toBe(401);

    const invalidRes = await createChapter(ownerCookie, book._id, {
      title: "",
      content: "tiny",
    });
    expect(invalidRes.status).toBe(400);
  });

  test("GET /api/books/:bookId/chapters lists ordered chapters with visibility rules", async () => {
    const { cookie: ownerCookie } = await createAuthorUser("owner-list");
    const { cookie: readerCookie } = await createRegisteredUser("reader-list");
    const book = await createBookAsAuthor(ownerCookie);

    const c1Res = await createChapter(ownerCookie, book._id, {
      title: "Draft Chapter",
    });
    const c2Res = await createChapter(ownerCookie, book._id, {
      title: "Published Chapter",
    });

    await ChapterModel.findByIdAndUpdate(c2Res.body.data.chapter._id, {
      status: "published",
    });

    const ownerList = await api
      .get(`/api/books/${book._id}/chapters`)
      .set("Cookie", ownerCookie);
    expect(ownerList.status).toBe(200);
    expect(ownerList.body.data.chapters).toHaveLength(2);
    expect(ownerList.body.data.chapters[0].title).toBe("Draft Chapter");
    expect(ownerList.body.data.chapters[1].title).toBe("Published Chapter");

    const ownerDraftOnly = await api
      .get(`/api/books/${book._id}/chapters?status=draft`)
      .set("Cookie", ownerCookie);
    expect(ownerDraftOnly.status).toBe(200);
    expect(ownerDraftOnly.body.data.chapters).toHaveLength(1);
    expect(ownerDraftOnly.body.data.chapters[0].title).toBe("Draft Chapter");

    const readerList = await api
      .get(`/api/books/${book._id}/chapters`)
      .set("Cookie", readerCookie);
    expect(readerList.status).toBe(200);
    expect(readerList.body.data.chapters).toHaveLength(1);
    expect(readerList.body.data.chapters[0].title).toBe("Published Chapter");

    const anonymousList = await api.get(`/api/books/${book._id}/chapters`);
    expect(anonymousList.status).toBe(200);
    expect(anonymousList.body.data.chapters).toHaveLength(1);
  });

  test("GET /api/books/:bookId/chapters/:chapterId enforces draft visibility and returns full chapter", async () => {
    const { cookie: ownerCookie } = await createAuthorUser("owner-get");
    const { cookie: readerCookie } = await createRegisteredUser("reader-get");
    const book = await createBookAsAuthor(ownerCookie);

    const draftRes = await createChapter(ownerCookie, book._id, {
      title: "Private Draft",
    });
    const publishedRes = await createChapter(ownerCookie, book._id, {
      title: "Public Chapter",
    });
    await ChapterModel.findByIdAndUpdate(publishedRes.body.data.chapter._id, {
      status: "published",
    });

    const ownerDraft = await api
      .get(`/api/books/${book._id}/chapters/${draftRes.body.data.chapter._id}`)
      .set("Cookie", ownerCookie);
    expect(ownerDraft.status).toBe(200);
    expect(ownerDraft.body.data.chapter.content).toBeDefined();
    expect(ownerDraft.body.data.chapter.wordCount).toBeGreaterThan(0);

    const readerDraft = await api
      .get(`/api/books/${book._id}/chapters/${draftRes.body.data.chapter._id}`)
      .set("Cookie", readerCookie);
    expect(readerDraft.status).toBe(404);

    const readerPublished = await api
      .get(
        `/api/books/${book._id}/chapters/${publishedRes.body.data.chapter._id}`,
      )
      .set("Cookie", readerCookie);
    expect(readerPublished.status).toBe(200);
    expect(readerPublished.body.data.chapter.status).toBe("published");
    expect(readerPublished.body.data.chapter.content).toBeDefined();
  });

  test("PUT /api/books/:bookId/chapters/:chapterId updates chapter and refreshes wordCount", async () => {
    const { cookie: ownerCookie } = await createAuthorUser("owner-update");
    const { cookie: strangerCookie } =
      await createAuthorUser("stranger-update");
    const book = await createBookAsAuthor(ownerCookie);
    const chapterRes = await createChapter(ownerCookie, book._id, {
      title: "To Update",
    });
    const chapterId = chapterRes.body.data.chapter._id;

    const firstFetch = await api
      .get(`/api/books/${book._id}/chapters/${chapterId}`)
      .set("Cookie", ownerCookie);
    const oldWordCount = firstFetch.body.data.chapter.wordCount;

    const updateRes = await api
      .put(`/api/books/${book._id}/chapters/${chapterId}`)
      .set("Cookie", ownerCookie)
      .send({
        title: "Updated Title",
        content: "updated ".repeat(220),
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.chapter.title).toBe("Updated Title");
    expect(updateRes.body.data.chapter.wordCount).toBeGreaterThan(oldWordCount);

    const forbiddenRes = await api
      .put(`/api/books/${book._id}/chapters/${chapterId}`)
      .set("Cookie", strangerCookie)
      .send({ title: "Hacked" });
    expect(forbiddenRes.status).toBe(401);
  });

  test("DELETE /api/books/:bookId/chapters/:chapterId deletes chapter and removes it from book.chapters", async () => {
    const { cookie: ownerCookie } = await createAuthorUser("owner-delete");
    const book = await createBookAsAuthor(ownerCookie);

    const c1 = await createChapter(ownerCookie, book._id, {
      title: "First",
    });
    const c2 = await createChapter(ownerCookie, book._id, {
      title: "Second",
    });
    const c3 = await createChapter(ownerCookie, book._id, {
      title: "Third",
    });

    const deleteRes = await api
      .delete(`/api/books/${book._id}/chapters/${c2.body.data.chapter._id}`)
      .set("Cookie", ownerCookie);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.success).toBe(true);

    const listRes = await api
      .get(`/api/books/${book._id}/chapters`)
      .set("Cookie", ownerCookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.chapters).toHaveLength(2);
    expect(listRes.body.data.chapters.map((ch) => ch.title)).toEqual(
      expect.arrayContaining(["First", "Third"]),
    );

    const deletedChapter = await ChapterModel.findById(
      c2.body.data.chapter._id,
    );
    expect(deletedChapter).toBeNull();
    const updatedBook = await BookModel.findById(book._id);
    expect(updatedBook.chapters.map((id) => id.toString())).not.toContain(
      c2.body.data.chapter._id,
    );
    expect(c1.body.data.chapter._id).not.toBe(c3.body.data.chapter._id);
  });

  test("PUT /api/books/:bookId/chapters/reorder reorders using book.chapters id array", async () => {
    const { cookie: ownerCookie } = await createAuthorUser("owner-reorder");
    const { cookie: strangerCookie } =
      await createAuthorUser("stranger-reorder");
    const book = await createBookAsAuthor(ownerCookie);

    const c1 = await createChapter(ownerCookie, book._id, {
      title: "One",
    });
    const c2 = await createChapter(ownerCookie, book._id, {
      title: "Two",
    });
    const c3 = await createChapter(ownerCookie, book._id, {
      title: "Three",
    });

    const reorderRes = await api
      .put(`/api/books/${book._id}/chapters/reorder`)
      .set("Cookie", ownerCookie)
      .send({
        chapters: [
          c3.body.data.chapter._id,
          c1.body.data.chapter._id,
          c2.body.data.chapter._id,
        ],
      });

    expect(reorderRes.status).toBe(200);
    const updatedBook = await BookModel.findById(book._id);
    expect(updatedBook.chapters.map((id) => id.toString())).toEqual([
      c3.body.data.chapter._id,
      c1.body.data.chapter._id,
      c2.body.data.chapter._id,
    ]);

    const forbiddenReorder = await api
      .put(`/api/books/${book._id}/chapters/reorder`)
      .set("Cookie", strangerCookie)
      .send({
        chapters: [
          c1.body.data.chapter._id,
          c2.body.data.chapter._id,
          c3.body.data.chapter._id,
        ],
      });
    expect(forbiddenReorder.status).toBe(401);
  });
});
