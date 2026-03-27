import { faker } from "@faker-js/faker";
import mongoose from "mongoose";

const DEFAULT_PASSWORD = "SeedPass123";
const DEFAULT_AVATAR_BASE = "https://api.dicebear.com/9.x";

const GENRES = [
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Romance",
  "Historical Fiction",
  "Thriller",
  "Literary Fiction",
  "Self Help",
  "Biography",
  "Adventure",
] as const;

const SERIES_WORDS = [
  "Ashen",
  "Glass",
  "Midnight",
  "Lantern",
  "Storm",
  "Golden",
  "Silent",
  "Burning",
  "Ivory",
  "Obsidian",
] as const;

const BOOK_NOUNS = [
  "Archive",
  "Harbor",
  "Inheritance",
  "Atlas",
  "Signal",
  "Paradox",
  "Garden",
  "Oath",
  "Map",
  "Testament",
] as const;

const SHELF_TEMPLATES = [
  {
    name: "Want to Read",
    description: "Books queued for future reading sessions.",
  },
  {
    name: "Currently Reading",
    description: "Books with a bookmark tucked inside right now.",
  },
  {
    name: "Read",
    description: "Finished books worth remembering.",
  },
  {
    name: "Favorites",
    description: "Standout books I would recommend quickly.",
  },
] as const;

type SeedUser = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatar: string;
  role: "user" | "admin" | "author";
  authorId?: mongoose.Types.ObjectId;
};

type SeedAuthor = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  penName: string;
  bio: string;
  socialLinks: {
    website: string;
    x: string;
    instagram: string;
    linkedIn: string;
    facebook: string;
  };
  isVerified: boolean;
  status: "pending" | "approved" | "rejected";
};

type SeedChapter = {
  _id: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  status: "draft" | "published";
  wordCount: number;
};

type SeedBook = {
  _id: mongoose.Types.ObjectId;
  title: string;
  authorId: mongoose.Types.ObjectId;
  chapters: mongoose.Types.ObjectId[];
  genre: string;
  isbn: string;
  publishedYear: number;
  averageRating?: number;
  description: string;
  coverImage: string;
  createdBy: mongoose.Types.ObjectId;
  status: "draft" | "preview" | "published" | "archived";
  publishedAt?: Date;
};

type SeedReview = {
  _id: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
};

type SeedShelf = {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  name: string;
  description: string;
  books: mongoose.Types.ObjectId[];
};

export type SeedBundle = {
  users: SeedUser[];
  authors: SeedAuthor[];
  books: SeedBook[];
  chapters: SeedChapter[];
  reviews: SeedReview[];
  shelves: SeedShelf[];
};

type BookAssembly = {
  book: SeedBook;
  chapters: SeedChapter[];
};

const pickManyUnique = <T>(items: T[], count: number, exclude = new Set<T>()) => {
  const pool = items.filter((item) => !exclude.has(item));
  const shuffled = faker.helpers.shuffle(pool);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const buildAvatarUrl = (seed: string) =>
  `${DEFAULT_AVATAR_BASE}/lorelei/svg?seed=${encodeURIComponent(seed)}`;

const createTipTapDoc = (paragraphs: string[]) =>
  JSON.stringify({
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
  });

const countWords = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const makeIsbn = () =>
  faker.string.numeric({ length: 13, allowLeadingZeros: true });

const makeBookTitle = () =>
  `The ${faker.helpers.arrayElement(SERIES_WORDS)} ${faker.helpers.arrayElement(BOOK_NOUNS)}`;

const makeDescription = (genre: string) =>
  faker.lorem.sentences(3).slice(0, 210) +
  ` This ${genre.toLowerCase()} title follows people making difficult choices under pressure.`;

const makeComment = (rating: number) => {
  const tone =
    rating >= 4
      ? "The pacing stayed sharp and the characters landed well."
      : rating === 3
        ? "There is a lot to like here, even if parts feel uneven."
        : "The premise is interesting, but the execution did not fully work for me.";
  return `${faker.lorem.sentence()} ${tone}`.slice(0, 480);
};

const createAuthorProfile = (user: SeedUser) => {
  const authorId = new mongoose.Types.ObjectId();
  const handle = user.name.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return {
    author: {
      _id: authorId,
      userId: user._id,
      penName: `${user.name.toLowerCase()} writes`,
      bio: faker.lorem.sentences(2).slice(0, 320),
      socialLinks: {
        website: `https://www.${handle}writes.com`,
        x: `https://x.com/${handle}writes`,
        instagram: `https://instagram.com/${handle}writes`,
        linkedIn: `https://linkedin.com/in/${handle}writes`,
        facebook: `https://facebook.com/${handle}writes`,
      },
      isVerified: faker.datatype.boolean(0.6),
      status: "approved" as const,
    },
    authorId,
  };
};

const createChapter = (
  bookId: mongoose.Types.ObjectId,
  order: number,
  status: "draft" | "published",
): SeedChapter => {
  const paragraphs = faker.helpers.multiple(
    () => faker.lorem.paragraphs({ min: 1, max: 2 }),
    { count: faker.number.int({ min: 3, max: 5 }) },
  );
  const flattened = paragraphs.flatMap((block) =>
    block
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const plainText = flattened.join(" ");

  return {
    _id: new mongoose.Types.ObjectId(),
    bookId,
    title: `Chapter ${order}: ${faker.word.words({ count: { min: 2, max: 4 } })}`,
    content: createTipTapDoc(flattened),
    status,
    wordCount: countWords(plainText),
  };
};

const createBookAssembly = (
  author: SeedAuthor,
  authorUser: SeedUser,
  status: "draft" | "preview" | "published" | "archived",
): BookAssembly => {
  const bookId = new mongoose.Types.ObjectId();
  const genre = faker.helpers.arrayElement([...GENRES]);
  const chapterCount = faker.number.int({ min: 3, max: 8 });
  const publishedChapters =
    status === "draft"
      ? faker.number.int({ min: 0, max: Math.max(1, chapterCount - 1) })
      : status === "preview"
        ? faker.number.int({ min: 1, max: Math.max(1, chapterCount - 1) })
        : chapterCount;

  const chapters = Array.from({ length: chapterCount }, (_, index) =>
    createChapter(
      bookId,
      index + 1,
      index < publishedChapters ? "published" : "draft",
    ),
  );

  const publishedAt =
    status === "published" || status === "archived"
      ? faker.date.between({
          from: new Date("2018-01-01T00:00:00.000Z"),
          to: new Date("2025-12-31T23:59:59.999Z"),
        })
      : undefined;

  return {
    book: {
      _id: bookId,
      title: makeBookTitle(),
      authorId: author._id,
      chapters: chapters.map((chapter) => chapter._id),
      genre,
      isbn: makeIsbn(),
      publishedYear:
        publishedAt?.getFullYear() ??
        faker.number.int({ min: 2019, max: 2026 }),
      description: makeDescription(genre),
      coverImage: `https://picsum.photos/seed/${bookId.toString()}/640/960`,
      createdBy: authorUser._id,
      status,
      publishedAt,
    },
    chapters,
  };
};

const buildShelvesForUser = (
  userId: mongoose.Types.ObjectId,
  publishedBookIds: mongoose.Types.ObjectId[],
  reviewedBooks: mongoose.Types.ObjectId[],
): SeedShelf[] => {
  const reviewedSet = new Set(reviewedBooks.map((id) => id.toString()));
  const readCount = reviewedBooks.length
    ? faker.number.int({
        min: Math.min(2, reviewedBooks.length),
        max: Math.min(8, reviewedBooks.length),
      })
    : 0;
  const read = faker.helpers.shuffle(reviewedBooks).slice(0, readCount);

  const remainingPublished = publishedBookIds.filter(
    (bookId) => !reviewedSet.has(bookId.toString()),
  );
  const currentlyReadingCount = remainingPublished.length
    ? faker.number.int({
        min: 1,
        max: Math.min(3, remainingPublished.length),
      })
    : 0;
  const currentlyReading = faker.helpers
    .shuffle(remainingPublished)
    .slice(0, currentlyReadingCount);

  const currentSet = new Set(currentlyReading.map((id) => id.toString()));
  const wantToReadPool = remainingPublished.filter(
    (bookId) => !currentSet.has(bookId.toString()),
  );
  const wantToReadCount = wantToReadPool.length
    ? faker.number.int({
        min: Math.min(3, wantToReadPool.length),
        max: Math.min(10, wantToReadPool.length),
      })
    : 0;
  const wantToRead = faker.helpers
    .shuffle(wantToReadPool)
    .slice(0, wantToReadCount);
  const favoriteCandidates = read.filter(() => faker.datatype.boolean(0.5));

  const shelfBooks = new Map<string, mongoose.Types.ObjectId[]>();
  shelfBooks.set("Want to Read", wantToRead);
  shelfBooks.set("Currently Reading", currentlyReading);
  shelfBooks.set("Read", read);
  shelfBooks.set("Favorites", favoriteCandidates.slice(0, 5));

  return SHELF_TEMPLATES.map((template) => ({
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    name: template.name,
    description: template.description,
    books: shelfBooks.get(template.name) ?? [],
  }));
};

export const generateSeedData = (): SeedBundle => {
  faker.seed(20260327);

  const users: SeedUser[] = [];
  const authors: SeedAuthor[] = [];
  const books: SeedBook[] = [];
  const chapters: SeedChapter[] = [];
  const reviews: SeedReview[] = [];
  const shelves: SeedShelf[] = [];

  const adminUser: SeedUser = {
    _id: new mongoose.Types.ObjectId(),
    name: "AdminRoot",
    email: "admin@bookreview.dev",
    password: DEFAULT_PASSWORD,
    avatar: buildAvatarUrl("admin-root"),
    role: "admin",
  };
  users.push(adminUser);

  const authorUsers = Array.from({ length: 10 }, () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const displayName = `${firstName}${lastName}`.slice(0, 18);
    const baseUser: SeedUser = {
      _id: new mongoose.Types.ObjectId(),
      name: displayName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: DEFAULT_PASSWORD,
      avatar: buildAvatarUrl(displayName),
      role: "author",
    };
    const { author, authorId } = createAuthorProfile(baseUser);
    baseUser.authorId = authorId;
    authors.push(author);
    users.push(baseUser);
    return { user: baseUser, author };
  });

  const readerUsers = Array.from({ length: 24 }, () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const displayName = `${firstName}${lastName}`.slice(0, 18);
    const user: SeedUser = {
      _id: new mongoose.Types.ObjectId(),
      name: displayName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: DEFAULT_PASSWORD,
      avatar: buildAvatarUrl(displayName),
      role: "user",
    };
    users.push(user);
    return user;
  });

  const bookAssemblies = authorUsers.flatMap(({ user, author }) => {
    const statuses: Array<"draft" | "preview" | "published" | "archived"> = [
      "published",
      "published",
      "preview",
      faker.datatype.boolean(0.35) ? "archived" : "draft",
    ];

    return statuses.map((status) => createBookAssembly(author, user, status));
  });

  for (const assembly of bookAssemblies) {
    books.push(assembly.book);
    chapters.push(...assembly.chapters);
  }

  const publishedBooks = books.filter((book) => book.status === "published");
  const reviewUsers = [...readerUsers, ...authorUsers.map(({ user }) => user)];
  const userReviewedBooks = new Map<string, mongoose.Types.ObjectId[]>();

  for (const book of publishedBooks) {
    const author = authorUsers.find(({ author }) => author._id.equals(book.authorId));
    const eligibleReviewers = reviewUsers.filter(
      (user) => !user._id.equals(author!.user._id),
    );
    const reviewers = pickManyUnique(
      eligibleReviewers,
      faker.number.int({ min: 4, max: Math.min(10, eligibleReviewers.length) }),
    );

    for (const reviewer of reviewers) {
      const rating = faker.number.int({ min: 2, max: 5 });
      reviews.push({
        _id: new mongoose.Types.ObjectId(),
        book: book._id,
        user: reviewer._id,
        rating,
        comment: makeComment(rating),
      });

      const existing = userReviewedBooks.get(reviewer._id.toString()) ?? [];
      existing.push(book._id);
      userReviewedBooks.set(reviewer._id.toString(), existing);
    }
  }

  const ratingsByBook = new Map<string, number[]>();
  for (const review of reviews) {
    const key = review.book.toString();
    const list = ratingsByBook.get(key) ?? [];
    list.push(review.rating);
    ratingsByBook.set(key, list);
  }

  for (const book of books) {
    const ratings = ratingsByBook.get(book._id.toString()) ?? [];
    if (ratings.length > 0) {
      const average =
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      book.averageRating = Number(average.toFixed(2));
    }
  }

  const publishedBookIds = publishedBooks.map((book) => book._id);
  for (const user of users) {
    const reviewed = userReviewedBooks.get(user._id.toString()) ?? [];
    shelves.push(...buildShelvesForUser(user._id, publishedBookIds, reviewed));
  }

  return {
    users,
    authors,
    books,
    chapters,
    reviews,
    shelves,
  };
};

