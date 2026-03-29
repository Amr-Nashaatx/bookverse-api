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
  findCriteria?: { fieldName: string; value: unknown };
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
> = { [K in TCollectionName]: TDocument[] } & {
  pageInfo: PaginatedPageInfo<TCursor>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses the sort string (e.g. "-createdAt" or "name") into a field name and
 * a numeric direction: -1 for descending, 1 for ascending.
 */
function parseSortParam(sort: string): { field: string; direction: 1 | -1 } {
  const isDescending = sort.startsWith("-");
  return {
    field: isDescending ? sort.slice(1) : sort,
    direction: isDescending ? -1 : 1,
  };
}

/**
 * Builds the cursor filter for the sort field.
 *
 * The goal is to fetch documents that come AFTER or BEFORE the cursor value
 * in the sorted sequence. The operator depends on both the sort direction and
 * which cursor we're using:
 *
 *   Forward  (after cursor):
 *     - ASC  sort → next items have a GREATER value  → $gt
 *     - DESC sort → next items have a SMALLER value  → $lt
 *
 *   Backward (before cursor):
 *     - ASC  sort → prev items have a SMALLER value  → $lt
 *     - DESC sort → prev items have a GREATER value  → $gt
 */
function buildCursorFilter(
  field: string,
  direction: 1 | -1,
  cursor: CursorValue,
  isBackward: boolean,
): Record<string, unknown> {
  // Forward uses the natural sort operator; backward flips it.
  const forwardOperator = direction === 1 ? "$gt" : "$lt";
  const operator = isBackward
    ? forwardOperator === "$gt"
      ? "$lt"
      : "$gt"
    : forwardOperator;

  return { [field]: { [operator]: cursor } };
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function fetchPaginatedData<
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
) {
  const normalizedLimit = Math.max(1, Number(limit) || 10);

  // ── 1. Parse sort string ──────────────────────────────────────────────────
  // Determine which field to sort on and whether it's ascending or descending.
  const { field, direction } = parseSortParam(sort);

  // ── 2. Determine pagination direction ────────────────────────────────────
  // We are paginating backward only when `before` is provided without `after`.
  // Any other combination (only `after`, or neither) is treated as forward.
  const isBackward = !!before && !after;

  // ── 3. Build query filters ────────────────────────────────────────────────
  // Start with the caller-supplied filters, then layer on cursor and
  // findCriteria constraints.
  const queryFilters: Record<string, unknown> = { ...filters };

  const activeCursor = isBackward ? before : after;
  const hasCursor = activeCursor !== null && activeCursor !== undefined;

  if (hasCursor) {
    Object.assign(
      queryFilters,
      buildCursorFilter(field, direction, activeCursor, isBackward),
    );
  }

  if (queryOptions.findCriteria) {
    queryFilters[queryOptions.findCriteria.fieldName] =
      queryOptions.findCriteria.value;
  }

  // ── 4. Determine DB sort order ────────────────────────────────────────────
  // When paginating backward we reverse the sort so we naturally get the
  // items closest to the cursor. and then flip the results back
  const dbSortDirection = (
    isBackward ? -direction : direction
  ) as mongoose.SortOrder;

  // ── 5. Execute query (fetch limit + 1) ───────────────────────────────────
  // Fetching one extra document lets us know whether another page exists
  // without a separate COUNT query.
  let query = Model.find(queryFilters)
    .sort({ [field]: dbSortDirection })
    .limit(normalizedLimit + 1);

  if (queryOptions.populate) {
    const [path, select] = queryOptions.populate;
    query = query.populate(path, select);
  }

  let results = await query;

  // ── 6. Detect overflow & restore order ───────────────────────────────────
  const hasExtraItem = results.length > normalizedLimit;

  // Drop the extra sentinel document — it was only used to detect overflow.
  if (hasExtraItem) results = results.slice(0, normalizedLimit);

  // Backward queries were fetched in reverse order; put them back in the
  // correct display order before returning them to the caller.
  if (isBackward) results = results.reverse();

  // ── 7. Derive page flags ──────────────────────────────────────────────────
  // `hasNextPage` and `hasPrevPage` are relative to the returned slice,
  // not the raw DB direction.
  //
  //   Forward:  overflow means there IS a next page;
  //             an `after` cursor means we came from a previous page.
  //
  //   Backward: overflow means there IS a previous page;
  //             we always have a next page (we navigated backward to get here).
  const hasNextPage = isBackward ? !!after || true : hasExtraItem;
  const hasPrevPage = isBackward ? hasExtraItem : !!after;

  // ── 8. Extract cursor values ──────────────────────────────────────────────
  // Cursors point to the edges of the returned slice so the client can
  // request the next or previous page.
  const getCursorValue = (
    doc?: mongoose.HydratedDocument<TRawDoc>,
  ): CursorValue => (doc ? (doc.get(field) as CursorValue) : null);

  const prevCursor = getCursorValue(results[0]);
  const nextCursor = getCursorValue(results[results.length - 1]);

  return {
    [Model.collection.name]: results,
    pageInfo: { hasNextPage, hasPrevPage, nextCursor, prevCursor },
  } as PaginatedResult<TCollectionName, mongoose.HydratedDocument<TRawDoc>>;
}
