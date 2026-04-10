import { describe, test, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { UserModel } from "../../src/models/userModel.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { BookModel } from "../../src/models/bookModel.js";

let authCookie, authCookie1;
let testUserId,
  testBookId,
  testUser1Id,
  testBook1Id,
  testReviewId,
  testReview1Id,
  testReview,
  testReview1,
  testBook,
  testBook1;

beforeAll(async () => {
  testUserId = new mongoose.Types.ObjectId().toString();
  testUser1Id = new mongoose.Types.ObjectId().toString();
  testBookId = new mongoose.Types.ObjectId().toString();
  testBook1Id = new mongoose.Types.ObjectId().toString();
  testReviewId = new mongoose.Types.ObjectId().toString();
  testReview1Id = new mongoose.Types.ObjectId().toString();

  const user = await UserModel.create({
    _id: testUserId,
    name: "test",
    email: "test@test.com",
    password: "pass1234",
  });

  const user1 = await UserModel.create({
    _id: testUser1Id,
    name: "test1",
    email: "test1@test.com",
    password: "pass1234",
  });

  testBook = {
    _id: testBookId,
    title: "The Hobbit",
    authorId: new mongoose.Types.ObjectId(),
    genre: "Fantasy",
    description: "A story about three hobbits",
    createdBy: testUserId,
    publishedYear: 1937,
  };

  testBook1 = {
    _id: testBook1Id,
    title: "Naruto",
    authorId: new mongoose.Types.ObjectId(),
    genre: "Fantasy",
    description: "A story about ninjas",
    createdBy: testUserId,
    publishedYear: 1997,
  };

  testReview = {
    _id: testReviewId,
    user: testUserId,
    book: testBookId,
    rating: 5,
    comment: "this is so good",
  };

  testReview1 = {
    _id: testReview1Id,
    user: testUser1Id,
    book: testBookId,
    rating: 3.5,
    comment: "this is so bad",
  };

  const token = jwt.sign(
    { userId: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const token1 = jwt.sign(
    { userId: user1._id, email: user1.email, name: user1.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  authCookie = `jwt_token=${token}`;
  authCookie1 = `jwt_token=${token1}`;
});

describe("Review Routes ", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await BookModel.create(testBook);
  });

  describe("POST /api/reviews/book/:bookId/reviews", () => {
    test("creates a review (auth required)", async () => {
      const res = await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      expect(res.status).toBe(201);
      expect(res.body.status).toMatch("success");
      expect(res.body.data.review).toMatchObject(testReview);
    });

    test("returns error if as user already reviewed the book", async () => {
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      const res = await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send({
          user: testUserId,
          book: testBookId,
          rating: 3.5,
          comment: "this is so med",
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toMatch("fail");
    });
  });
  describe("GET /api/reviews/book/:bookId/reviews", () => {
    test("returns reviews for that book", async () => {
      // review testBook as testUser
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      // review testBook as testUser1
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie1)
        .send(testReview1);

      // create another book "book2"
      const book2 = await BookModel.create(testBook1);
      // create a review on book2 as user1
      // This review should NOT appear
      await request(app)
        .post(`/api/reviews/book/${testBook1Id}/reviews`)
        .set("Cookie", authCookie)
        .send({
          rating: 4.5,
          user: testUserId,
          book: book2._id,
          comment: "this is review3 of user1",
        });

      const res = await request(app).get(
        `/api/reviews/book/${testBookId}/reviews`
      );

      expect(res.status).toBe(200);

      const { reviews } = res.body.data;

      expect(reviews).toHaveLength(2);
      expect(reviews[0].user.email).toBeDefined();
      expect(reviews[0].user.name).toBeDefined();
      expect(reviews.map((r) => r.comment)).toContain("this is so good");
      expect(reviews.map((r) => r.comment)).toContain("this is so bad");
    });
    test("paginates forward using after cursor", async () => {
      // review testBook as testUser
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      // review testBook as testUser1
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie1)
        .send(testReview1);

      // First page
      let res = await request(app).get(
        `/api/reviews/book/${testBookId}/reviews?limit=1`
      );

      expect(res.status).toBe(200);

      const { pageInfo, reviews } = res.body.data;

      const cursor = pageInfo.nextCursor;
      expect(cursor).toBeTruthy();
      expect(reviews).toHaveLength(1);
      expect(reviews[0].user.email).toBeDefined();
      expect(reviews[0].user.name).toBeDefined();
      expect(reviews.map((r) => r.comment)).toContain(testReview1.comment);
      // Second page
      res = await request(app).get(
        `/api/reviews/book/${testBookId}/reviews?limit=1&after=${cursor}`
      );

      const lastPageReviews = res.body.data.reviews;
      const lastPageCursor = res.body.data.pageInfo.nextCursor;

      expect(lastPageReviews).toHaveLength(1);
      expect(lastPageCursor).toBeTruthy();
      expect(lastPageReviews).toHaveLength(1);
      expect(lastPageReviews[0].user.email).toBeDefined();
      expect(lastPageReviews[0].user.name).toBeDefined();
      expect(lastPageReviews.map((r) => r.comment)).toContain(
        testReview.comment
      );
    });
    test("paginates backward using before cursor", async () => {
      // review testBook as testUser
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      // review testBook as testUser1
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie1)
        .send(testReview1);

      // First page
      let res = await request(app).get(
        `/api/reviews/book/${testBookId}/reviews?limit=1`
      );

      const { pageInfo } = res.body.data;
      const nextCursor = pageInfo.nextCursor;

      // Second page
      res = await request(app).get(
        `/api/reviews/book/${testBookId}/reviews?limit=1&after=${nextCursor}`
      );

      const { pageInfo: page2Info } = res.body.data;
      const prevCursor = page2Info.prevCursor;

      // Back to first page
      res = await request(app).get(
        `/api/reviews/book/${testBookId}/reviews?limit=1&before=${prevCursor}`
      );
      const reviews = res.body.data.reviews;
      const lastPageCursor = res.body.data.pageInfo.nextCursor;

      expect(reviews).toHaveLength(1);
      expect(lastPageCursor).toBeTruthy();
      expect(reviews).toHaveLength(1);
      expect(reviews[0].user.email).toBeDefined();
      expect(reviews[0].user.name).toBeDefined();
      expect(reviews.map((r) => r.comment)).toContain(testReview1.comment);
    });
  });
  describe("PUT /api/reviews/:id", () => {
    test("updates a review by its id and returns the updated document", async () => {
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      const res = await request(app)
        .put(`/api/reviews/${testReviewId}`)
        .set("Cookie", authCookie)
        .send({ comment: "updated comment" });

      expect(res.status).toBe(200);
      expect(res.body.status).toMatch("success");
      expect(res.body.data.review).toMatchObject({
        ...testReview,
        comment: "updated comment",
      });
    });

    test("throws error if user does not own review", async () => {
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      // create another user
      const user2Id = new mongoose.Types.ObjectId();
      const user2 = await UserModel.create({
        _id: user2Id,
        name: "user2",
        email: "test2@test.com",
        password: "pass1234",
      });
      const token2 = jwt.sign(
        { userId: user2Id, email: user2.email, name: user2.name },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const authCookie2 = `jwt_token=${token2}`;
      // update review of user1 as user2 should fail
      const res = await request(app)
        .put(`/api/reviews/${testReviewId}`)
        .set("Cookie", authCookie2)
        .send({ comment: "updated comment" });

      expect(res.status).toBe(400);
      expect(res.body.status).toMatch("fail");
      expect(res.body.message).toMatch("User does not own review");
    });
  });
  describe("DELETE /api/reviews/:id", () => {
    test("deletes a review by its id", async () => {
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      const res = await request(app)
        .delete(`/api/reviews/${testReviewId}`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toMatch("success");
      expect(res.body.message).toMatch("Review deleted!");
    });
    test("throws error if user does not own review", async () => {
      await request(app)
        .post(`/api/reviews/book/${testBookId}/reviews`)
        .set("Cookie", authCookie)
        .send(testReview);

      // delete user2 from previous test
      await UserModel.deleteOne({ email: "test2@test.com" });
      // create another user
      const user2Id = new mongoose.Types.ObjectId();
      const user2 = await UserModel.create({
        _id: user2Id,
        name: "user2",
        email: "test2@test.com",
        password: "pass1234",
      });
      const token2 = jwt.sign(
        { userId: user2Id, email: user2.email, name: user2.name },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const authCookie2 = `jwt_token=${token2}`;
      // delete review of user1 as user2 should fail

      const res = await request(app)
        .delete(`/api/reviews/${testReviewId}`)
        .set("Cookie", authCookie2);

      expect(res.status).toBe(400);
      expect(res.body.status).toMatch("fail");
      expect(res.body.message).toMatch("User does not own review");
    });
  });
});
