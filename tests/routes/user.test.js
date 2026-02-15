import { api } from "../setup.js";
import { expect, describe, test } from "vitest";

describe("User Routes", () => {
  describe("/me route", () => {
    test("Fetch current user from cookie", async () => {
      const registerRes = await api.post("/api/auth/register").send({
        name: "Amr",
        email: "amr@test.com",
        password: "pass1234",
      });

      const cookie = registerRes.headers["set-cookie"];

      const res = await api.get("/api/users/me").set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe("amr@test.com");
    });
  });

  describe("PUT /:id route", () => {
    test("Update user successfully with valid data", async () => {
      const rand = Math.random().toString(36).substring(7);
      const registerRes = await api.post("/api/auth/register").send({
        name: "John",
        email: `john-${rand}@test.com`,
        password: "pass1234",
      });

      const cookie = registerRes.headers["set-cookie"];

      const meRes = await api.get("/api/users/me").set("Cookie", cookie);
      const userId = meRes.body.data.user._id;

      const updateRes = await api
        .put(`/api/users/${userId}`)
        .set("Cookie", cookie)
        .send({
          name: "Jane",
          email: `jane-${rand}@test.com`,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.status).toBe("success");
      expect(updateRes.body.message).toBe("User updated");
      expect(updateRes.body.data.user.name).toBe("Jane");
      expect(updateRes.body.data.user.email).toBe(`jane-${rand}@test.com`);
    });

    test("Update only name field", async () => {
      const rand = Math.random().toString(36).substring(7);
      const registerRes = await api.post("/api/auth/register").send({
        name: "Test",
        email: `test-${rand}@test.com`,
        password: "pass1234",
      });

      const cookie = registerRes.headers["set-cookie"];

      const meRes = await api.get("/api/users/me").set("Cookie", cookie);
      const userId = meRes.body.data.user._id;

      const updateRes = await api
        .put(`/api/users/${userId}`)
        .set("Cookie", cookie)
        .send({
          name: "Updated",
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.user.name).toBe("Updated");
      expect(updateRes.body.data.user.email).toBe(`test-${rand}@test.com`);
    });

    test("Update only email field", async () => {
      const rand = Math.random().toString(36).substring(7);
      const registerRes = await api.post("/api/auth/register").send({
        name: "Alex",
        email: `alex-old-${rand}@test.com`,
        password: "pass1234",
      });

      if (registerRes.status !== 201) {
        console.log("Register failed:", registerRes.status, registerRes.body);
      }
      expect(registerRes.status).toBe(201);

      const cookie = registerRes.headers["set-cookie"];
      expect(cookie).toBeDefined();

      const meRes = await api.get("/api/users/me").set("Cookie", cookie);
      const userId = meRes.body.data.user._id;

      const updateRes = await api
        .put(`/api/users/${userId}`)
        .set("Cookie", cookie)
        .send({
          email: `alex-new-${rand}@test.com`,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.user.name).toBe("alex");
      expect(updateRes.body.data.user.email).toBe(`alex-new-${rand}@test.com`);
    });

    test("Reject update without authentication", async () => {
      const rand = Math.random().toString(36).substring(7);
      const registerRes = await api.post("/api/auth/register").send({
        name: "Auth",
        email: `auth-${rand}@test.com`,
        password: "pass1234",
      });

      const cookie = registerRes.headers["set-cookie"];
      const meRes = await api.get("/api/users/me").set("Cookie", cookie);
      const userId = meRes.body.data.user._id;

      const updateRes = await api.put(`/api/users/${userId}`).send({
        name: "Hacked",
      });

      expect(updateRes.status).toBe(401);
    });

    test("Handle invalid user ID", async () => {
      const rand = Math.random().toString(36).substring(7);
      const registerRes = await api.post("/api/auth/register").send({
        name: "BadID",
        email: `bad-${rand}@test.com`,
        password: "pass1234",
      });

      const cookie = registerRes.headers["set-cookie"];

      const updateRes = await api
        .put(`/api/users/invalid-id-123`)
        .set("Cookie", cookie)
        .send({
          name: "Update",
        });

      expect([400, 404, 500]).toContain(updateRes.status);
    });
  });
});
