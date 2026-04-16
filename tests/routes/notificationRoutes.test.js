import jwt from "jsonwebtoken";
import { afterEach, beforeAll, beforeEach, describe, expect, vi } from "vitest";
import { EventEmitter } from "stream";
import { UserModel } from "../../src/models/userModel.js";

vi.mock("../../src/services/SSE/SSEManager.js", () => ({
  sseManager: {
    addClient: vi.fn(),
    removeClient: vi.fn(),
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

let authToken;
let user;

describe("Notifications routes: ", async () => {
  beforeAll(async () => {
    user = await UserModel.create({
      name: "Amr",
      email: "test@test.com",
      password: "pass1233",
    });
    authToken = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  describe("/stream", () => {
    test("adds the current connection for this user as an SSE client", async () => {
      const req = mockRequest(user._id);
      const res = mockRes();
      const next = vi.fn();

      await stream(req, res, next);

      //   await Promise.resolve()

      expect(sseManager.addClient).toHaveBeenCalledWith(user._id, res);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
