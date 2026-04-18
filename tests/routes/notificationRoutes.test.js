import jwt from "jsonwebtoken";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { EventEmitter } from "node:events";
import { UserModel } from "../../src/models/userModel.js";
import request from "supertest";
import { NotificationModel } from "../../src/models/notificationModel.js";
import app from "../../src/app.js";

vi.mock("../../src/services/SSE/SSEManager.js", () => ({
  sseManager: {
    addClient: vi.fn(),
    removeClient: vi.fn(),
    sendToUser: vi.fn(),
  },
}));

const { stream } =
  await import("../../src/controllers/notificationController.js");

const { sseManager } = await import("../../src/services/SSE/SSEManager.js");

function mockRequest(userId) {
  const req = new EventEmitter();
  req.user = { _id: userId };
  return req;
}

function mockRes() {
  return {
    end: vi.fn(),
    setHeader: vi.fn(),
    send: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
}

let authCookie;
let user;

describe("Notifications routes: ", () => {
  beforeAll(async () => {
    user = await UserModel.create({
      name: "Amr",
      email: "test@test.com",
      password: "pass1233",
    });
    const authToken = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    authCookie = `jwt_token=${authToken}`;
  });

  describe("/stream", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("adds the current connection for this user as an SSE client", async () => {
      const req = mockRequest(user._id);
      const res = mockRes();
      const next = vi.fn();

      await stream(req, res, next);

      expect(sseManager.addClient).toHaveBeenCalledWith(user._id, res);
      expect(next).not.toHaveBeenCalled();

      req.emit("close");
    });
    test("removes the SSE client associated with the request when it closes", async () => {
      const req = mockRequest(user._id);
      const res = mockRes();
      const next = vi.fn();

      await stream(req, res, next);

      req.emit("close");

      expect(sseManager.removeClient).toHaveBeenCalledWith(user._id);
    });

    test("force closes stale streams after 2 hours", async () => {
      const req = mockRequest(user._id);
      const res = mockRes();
      const next = vi.fn();

      await stream(req, res, next);

      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      expect(sseManager.removeClient).toHaveBeenCalledWith(user._id);
      expect(res.end).toHaveBeenCalled();
    });
  });
  describe("/", () => {
    test("fetches unread notifications of current user", async () => {
      // create some notifications in DB
      const fakeNotifs = [
        {
          recipientId: user._id,
          title: "fake",
          message: "fake message",
        },
        {
          recipientId: user._id,
          title: "fake number two",
          message: "fake message number two",
        },
      ];
      const addedNotifs = await NotificationModel.insertMany(fakeNotifs);
      const api = request(app);

      const { body, status } = await api
        .get("/api/notifications/")
        .set("Cookie", authCookie);

      expect(status).toBe(200);
      expect(body.data.notifications).toBeDefined();
      expect(body.data.notifications[0].title).toBe("fake");
      expect(body.data.notifications[1].title).toBe("fake number two");
    });
  });
  describe("/:id/read", () => {
    test("mark a specific notification as read", async () => {
      const fakeNotif = {
        recipientId: user._id,
        title: "fake",
        message: "fake message",
      };
      const addedNotif = await NotificationModel.create(fakeNotif);
      const api = request(app);

      const { status } = await api
        .patch(`/api/notifications/${addedNotif._id}/read`)
        .set("Cookie", authCookie);

      expect(status).toBe(204);

      const readNotif = await NotificationModel.findOne({
        _id: addedNotif._id,
      });

      expect(readNotif.readAt).toBeDefined();
      expect(readNotif.readAt).toBeInstanceOf(Date);
    });
  });
});
