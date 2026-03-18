import mongoose from "mongoose";

type CursorValue = string | number | Date | mongoose.Types.ObjectId | null;

type CursorPaginationFilters = Record<string, unknown>;

export type CursorPaginationParams<
  TFilters extends CursorPaginationFilters = CursorPaginationFilters,
> = {
  filters?: TFilters;
  after?: CursorValue;
  before?: CursorValue;
  limit?: number;
  sort?: string;
};

export type FetchPaginatedQueryOptions = {
  findCriteria?: {
    fieldName: string;
    value: unknown;
  };
  populate?: [path: string, select?: string] | string[];
  aggregate?: Array<{
    from: string;
    localField: string;
    foreignField: string;
    as: string;
  }>;
};

export type PaginatedPageInfo<TCursor = CursorValue> = {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor: TCursor;
  prevCursor: TCursor;
};

export type PaginatedResult<
  TCollectionName extends string,
  TDocument,
  TCursor = CursorValue,
> = {
  [K in TCollectionName]: TDocument[];
} & {
  pageInfo: PaginatedPageInfo<TCursor>;
};

export const fetchPaginatedData = async <
  TRawDoc,
  TCollectionName extends string,
  TFilters extends CursorPaginationFilters = CursorPaginationFilters,
>(
  Model: mongoose.Model<TRawDoc> & { collection: { name: TCollectionName } },
  {
    filters = {} as TFilters,
    after = null,
    before = null,
    limit = 10,
    sort = "-_id",
  }: CursorPaginationParams<TFilters>,
  queryOptions: FetchPaginatedQueryOptions = {},
): Promise<
  PaginatedResult<TCollectionName, mongoose.HydratedDocument<TRawDoc>>
> => {
  const mutableFilters = { ...filters } as Record<string, unknown>;

  const [field, direction] = sort.startsWith("-")
    ? [sort.substring(1), -1 as const]
    : [sort, 1 as const];

  const isAfterExists = !!after;
  const isBeforeExists = !!before;
  const isNoCursorSet = !after && !before;

  const isBackward = isBeforeExists && !isAfterExists;
  const isForward = isAfterExists || isNoCursorSet;

  if (isForward && isAfterExists) {
    mutableFilters[field] = direction === 1 ? { $gt: after } : { $lt: after };
  }

  if (isBackward) {
    mutableFilters[field] = direction === 1 ? { $lt: before } : { $gt: before };
  }

  const dbSort = (isBackward ? -direction : direction) as mongoose.SortOrder;

  if (queryOptions.findCriteria) {
    mutableFilters[queryOptions.findCriteria.fieldName] =
      queryOptions.findCriteria.value;
  }

  let query = Model.find(mutableFilters);

  if (queryOptions.populate) {
    const [path, select] = queryOptions.populate;
    query = query.populate(path, select);
  }

  let queryResult = await query
    .sort({ [field]: dbSort })
    .limit(Number(limit) + 1);

  const hasMore = queryResult.length > limit;
  if (hasMore) queryResult.pop();

  queryResult = isBackward ? queryResult.reverse() : queryResult;

  let hasNextPage = false;
  let hasPrevPage = false;

  if (isBackward) {
    hasPrevPage = hasMore;
    hasNextPage = true;
  } else {
    hasNextPage = hasMore;
    hasPrevPage = !!after;
  }

  const firstItem = queryResult[0];
  const lastItem = queryResult[queryResult.length - 1];
  const getCursorValue = (doc?: mongoose.HydratedDocument<TRawDoc>) =>
    doc ? (doc.get(field) as CursorValue) : null;

  return {
    [Model.collection.name]: queryResult,
    pageInfo: {
      hasNextPage,
      hasPrevPage,
      nextCursor: getCursorValue(lastItem),
      prevCursor: getCursorValue(firstItem),
    },
  } as PaginatedResult<TCollectionName, mongoose.HydratedDocument<TRawDoc>>;
};
