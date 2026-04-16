import { expect, describe, test } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

const api = request(app);

describe("Auth routes", () => {
  describe("/register route", () => {
    test("Register new user", async () => {
      const res = await api.post("/api/auth/register").send({
        name: "Amr",
        email: "amr@test.com",
        password: "pass1234",
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.user).toHaveProperty("email", "amr@test.com");
      expect(res.headers["set-cookie"]).toBeDefined(); // cookie should be sent
      const cookies = res.headers["set-cookie"];
      const refreshToken = cookies.find((c) => c.startsWith("refresh_token"));
      expect(refreshToken).toBeDefined();
    });

    test("Prevent duplicate registration", async () => {
      await api.post("/api/auth/register").send({
        name: "Amr",
        email: "amr@test.com",
        password: "pass1234",
      });
      const res = await api.post("/api/auth/register").send({
        name: "Amr2",
        email: "amr@test.com",
        password: "pass5678",
      });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Email already exists");
    });
  });

  describe("/login route", () => {
    test("Login with valid credentials", async () => {
      await api.post("/api/auth/register").send({
        name: "Amr",
        email: "amr@test.com",
        password: "pass1234",
      });

      const res = await api.post("/api/auth/login").send({
        email: "amr@test.com",
        password: "pass1234",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe("amr@test.com");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    test("Reject login with wrong password", async () => {
      await api.post("/api/auth/register").send({
        name: "Amr",
        email: "amr@test.com",
        password: "pass1234",
      });

      const res = await api.post("/api/auth/login").send({
        email: "amr@test.com",
        password: "wrongpass",
      });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });

    test("Reject login with wrong email", async () => {
      await api.post("/api/auth/register").send({
        name: "Amr",
        email: "amr@test.com",
        password: "pass1234",
      });

      const res = await api.post("/api/auth/login").send({
        email: "amr@test2.com",
        password: "pass1234",
      });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });
  });

  describe("/refresh route", () => {
    test("Refresh token successfully", async () => {
      // 1. Register
      await api.post("/api/auth/register").send({
        name: "AmrRefresh",
        email: "refresh@test.com",
        password: "pass1234",
      });

      // 2. Login to get tokens
      const loginRes = await api.post("/api/auth/login").send({
        email: "refresh@test.com",
        password: "pass1234",
      });

      // Extract refresh token from cookies
      const cookies = loginRes.headers["set-cookie"];
      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith("refresh_token")
      );

      // 3. Refresh
      const res = await api
        .post("/api/auth/refresh")
        .set("Cookie", [refreshTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();

      const newCookies = res.headers["set-cookie"];
      const newRefreshToken = newCookies.find((c) =>
        c.startsWith("refresh_token")
      );
      const newAccessToken = newCookies.find((c) => c.startsWith("jwt_token"));

      expect(newRefreshToken).toBeDefined();
      expect(newAccessToken).toBeDefined();
    });

    test("Fail with missing refresh token", async () => {
      const res = await api.post("/api/auth/refresh");
      expect(res.status).toBe(401);
      expect(res.body.status).toBe("fail");
      // Current implementation throws "refresh requried" (sic)
      // We should probably check the message if we want to be specific, or just status.
      // Based on controller: throw new AppError("refresh requried", 401);
    });

    test("Fail with invalid refresh token", async () => {
      const res = await api
        .post("/api/auth/refresh")
        .set("Cookie", ["refresh_token=invalid_token"]);

      expect(res.status).toBe(401);
      expect(res.body.status).toBe("fail");
    });
  });

  describe("/logout route", () => {
    test("Logout successfully", async () => {
      // 1. Register
      await api.post("/api/auth/register").send({
        name: "AmrLogout",
        email: "logout@test.com",
        password: "pass1234",
      });

      // 2. Login
      const loginRes = await api.post("/api/auth/login").send({
        email: "logout@test.com",
        password: "pass1234",
      });

      const cookies = loginRes.headers["set-cookie"];
      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith("refresh_token")
      );

      // 3. Logout
      const res = await api
        .post("/api/auth/logout")
        .set("Cookie", [refreshTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");

      const resCookies = res.headers["set-cookie"];
      const jwtCookie = resCookies.find((c) => c.startsWith("jwt_token=;"));
      const refreshCookie = resCookies.find((c) =>
        c.startsWith("refresh_token=;")
      );

      expect(jwtCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
    });
  });
});
