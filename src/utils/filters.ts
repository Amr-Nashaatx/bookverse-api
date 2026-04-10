import { buildRangeQueriesFromString } from "./stringUtils.js";

export const buildBookFilters = (query: any): any => {
  const filter: any = {};
  const expectedFields = [
    { queryParam: "rating", fieldName: "averageRating" },
    { queryParam: "publishedYear", fieldName: "publishedYear" },
  ];
  buildRangeQueriesFromString(query, expectedFields, filter);
  // genre comes from frontend like this "genre[]".
  if (query["genre[]"]) {
    filter.genre = { $in: query["genre[]"] };
  }
  if (query.createdBy) {
    filter.createdBy = query.createdBy;
  }
  if (query.rating) {
    filter.averageRating = { $gt: query.rating };
  }
  if (query.author) {
    const regex = new RegExp(`^${query.author}`, "i");
    filter.author = { $regex: regex };
  }
  if (query.q) {
    filter.$text = { $search: query.q };
  }

  // Fetch only published books
  filter["status"] = "published";
  return filter;
};
