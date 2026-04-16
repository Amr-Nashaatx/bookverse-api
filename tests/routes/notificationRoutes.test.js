import jwt from "jsonwebtoken";
import { beforeAll, describe } from "vitest";
import request from "supertest";

let authToken;
beforeAll(async () => {
  const user = await UserModel.create({
    name: "Amr",
    email: "test@test.com",
    password: "pass1234",
  });
  const authToken = jwt.sign(
    { userId: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
});

describe("/");
