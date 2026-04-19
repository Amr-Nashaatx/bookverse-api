# Book Review API

Backend API for the Book Review app. It provides authentication, book catalog management, reviews, shelves, author publishing tools, chapter editing, preview sharing, cover/avatar uploads, and real-time notification updates for the React frontend.

## Linked Repository

This API is designed to work with the frontend repository:

- Frontend: https://github.com/Amr-Nashaatx/book-review-frontend

## Tech Stack

- Node.js with Express 5
- TypeScript with ESM
- MongoDB with Mongoose
- Redis for cached genre data
- JWT authentication with HTTP-only cookies
- Cloudinary for image storage
- Server-sent events for notifications
- Vitest, Supertest, and mongodb-memory-server for tests
- Docker Compose for local MongoDB, Redis, and API services

## Features

- User registration, login, logout, refresh tokens, and current-user lookup
- Protected routes using cookie-based JWT authentication
- Book browsing, filtering, creation, editing, deletion, status updates, and cover uploads
- Author profiles and author-owned book workflows
- Chapter creation, editing, deletion, listing, and reordering
- Reviews for books with create, update, and delete support
- Personal shelves with add/remove book actions
- Preview generation and share links
- Notification fetching, read state updates, and live SSE streaming
- Central error handling, request validation, and route-level middleware

## Project Structure

```text
src/
  config/          Database, Cloudinary, and browser setup
  controllers/     HTTP request handlers
  middlewares/     Auth, validation, uploads, errors
  models/          Mongoose models
  routes/          Express route modules
  services/        Business logic and integrations
  utils/           Shared helpers
tests/
  routes/          Integration tests
seeders/           Local database seed/reset scripts
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env` file in the API repo:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/book-review
JWT_SECRET=replace-with-a-secret
DEV_REFRESH_SECRET=replace-with-a-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
ENABLE_DEV_AUTH=false
```

Optional development token timing values:

```env
DEV_ACCESS_TOKEN_EXP=10m
DEV_REFRESH_TOKEN_EXP=30d
```

Start MongoDB and Redis locally, then run the API:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000/api
```

The frontend should use:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Docker Development

Run the API with MongoDB and Redis through Docker Compose:

```bash
npm run compose
```

Run the debug profile:

```bash
npm run compose:debug
```

## Scripts

```bash
npm run dev          # Start development server with nodemon and tsx
npm run start        # Start server with tsx
npm run type-check   # Run TypeScript type checking
npm test             # Run test suite
npm run coverage     # Run tests with coverage
npm run db:reset     # Reset local database
npm run db:seed      # Seed local database
npm run db:seed:fresh # Reset and seed local database
```

## Main API Areas

```text
/api/auth
/api/users
/api/books
/api/books/:bookId/chapters
/api/reviews
/api/shelves
/api/authors
/api/preview-share
/api/notifications
```

## Testing

Run all tests:

```bash
npm test
```

The tests use Vitest, Supertest, and mongodb-memory-server, so they do not require a separate MongoDB instance for the test database.

## Frontend Integration Notes

- CORS is configured for `http://localhost:5173`.
- Requests use credentials so cookies can be sent between the frontend and API.
- Notification streaming is available at `/api/notifications/stream`.
- The frontend repository linked above contains the React client that consumes these routes.
