import { api } from "../setup.js";
import { describe, expect, test } from "vitest";

let sequence = 0;

const createUserAndCookie = async () => {
  sequence += 1;
  const email = `author${sequence}@test.com`;
  const registerRes = await api.post("/api/auth/register").send({
    name: `user${sequence}`,
    email,
    password: "pass1234",
  });

  return registerRes.headers["set-cookie"];
};

describe("Author routes", () => {
  describe("POST /api/authors", () => {
    test("creates an author profile (auth required)", async () => {
      const cookie = await createUserAndCookie();

      const res = await api.post("/api/authors").set("Cookie", cookie).send({
        penName: "author-pen-1",
        bio: "Author bio",
        socialLinks: {
          website: "https://example.com",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.author.penName).toBe("author-pen-1");
      expect(res.body.data.author.status).toBe("pending");
      expect(res.body.data.author._id).toBeDefined();
      expect(res.body.data.author.userId).toBeDefined();
    });

    test("returns 401 when unauthenticated", async () => {
      const res = await api.post("/api/authors").send({
        penName: "author-pen-no-auth",
      });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe("fail");
    });

    test("returns 400 for duplicate penName", async () => {
      const cookie1 = await createUserAndCookie();
      const cookie2 = await createUserAndCookie();

      await api.post("/api/authors").set("Cookie", cookie1).send({
        penName: "same-pen",
      });

      const res = await api.post("/api/authors").set("Cookie", cookie2).send({
        penName: "same-pen",
      });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Pen name must be unique");
    });
  });

  describe("GET /api/authors/:penName", () => {
    test("returns public author profile", async () => {
      const cookie = await createUserAndCookie();
      await api.post("/api/authors").set("Cookie", cookie).send({
        penName: "public-pen",
        bio: "Public bio",
      });

      const res = await api.get("/api/authors/public-pen");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.author.penName).toBe("public-pen");
      expect(res.body.data.author.totalBooksPublished).toBe(0);
      expect(res.body.data.author.totalReviews).toBe(0);
      expect(res.body.data.author.isVerified).toBe(false);
    });

    test("returns 404 if penName does not exist", async () => {
      const res = await api.get("/api/authors/does-not-exist");

      expect(res.status).toBe(404);
      expect(res.body.status).toBe("fail");
    });
  });

  describe("GET /api/authors/me", () => {
    test("returns current author profile", async () => {
      const cookie = await createUserAndCookie();
      await api.post("/api/authors").set("Cookie", cookie).send({
        penName: "my-pen",
      });

      const res = await api.get("/api/authors/me").set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.author.penName).toBe("my-pen");
      expect(res.body.data.author.totalBooksPublished).toBe(0);
      expect(res.body.data.author.totalReviews).toBe(0);
    });

    test("returns 404 when user is not an author", async () => {
      const cookie = await createUserAndCookie();

      const res = await api.get("/api/authors/me").set("Cookie", cookie);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Author profile not found");
    });
  });

  describe("PUT /api/authors/me", () => {
    test("updates current author profile", async () => {
      const cookie = await createUserAndCookie();
      await api.post("/api/authors").set("Cookie", cookie).send({
        penName: "update-pen",
        bio: "Old bio",
      });

      const res = await api.put("/api/authors/me").set("Cookie", cookie).send({
        bio: "Updated bio",
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.author.penName).toBe("update-pen");
      expect(res.body.data.author.bio).toBe("Updated bio");
    });

    test("returns 404 when user is not an author", async () => {
      const cookie = await createUserAndCookie();

      const res = await api.put("/api/authors/me").set("Cookie", cookie).send({
        bio: "No profile",
      });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Author profile not found");
    });
  });
});
