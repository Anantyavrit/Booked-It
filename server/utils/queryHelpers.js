/**
 * Shared query-parsing helpers used by all list endpoints.
 */

// ── Pagination ────────────────────────────────────────────────────────────────

/**
 * parsePagination(query)
 * Safe defaults: page=1, limit=10, capped at 50.
 * Non-numeric / negative values fall back silently.
 */
export const parsePagination = (query) => {
  let page  = parseInt(query.page,  10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isFinite(page)  || page  < 1) page  = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  if (limit > 50) limit = 50;

  return { page, limit, skip: (page - 1) * limit };
};

/**
 * buildPaginationMeta(total, page, limit)
 * Returns a consistent pagination envelope included in every list response.
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

// Keep the shared helper available from this module for existing controllers.
export { escapeRegex } from './escapeRegex.js';

// ── Date helpers ──────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

/**
 * parseISTDateRange(dateString)
 *
 * Takes "YYYY-MM-DD" and returns { start, end } UTC Date objects representing
 * the full calendar day in IST (midnight IST → next midnight IST).
 *
 *   e.g. "2026-10-27"  →  start: 2026-10-26T18:30:00Z
 *                          end:   2026-10-27T18:30:00Z
 *
 * Throws an Error with .statusCode=400 on any invalid input so the
 * central errorHandler returns a proper 400 to the client.
 */
export const parseISTDateRange = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const err = new Error(
      `Invalid date format "${dateString}". Expected YYYY-MM-DD (e.g. 2026-10-27)`
    );
    err.statusCode = 400;
    throw err;
  }

  const [year, month, day] = dateString.split('-').map(Number);

  // Build midnight IST as UTC by subtracting the IST offset
  const startUTC = new Date(Date.UTC(year, month - 1, day)     - IST_OFFSET_MS);
  const endUTC   = new Date(Date.UTC(year, month - 1, day + 1) - IST_OFFSET_MS);

  // Catch normalised-away dates like 2026-13-45
  if (
    startUTC.getUTCFullYear() !== year ||
    startUTC.getUTCMonth()    !== month - 1 ||
    // day+1 wraps, so compare via endUTC.getUTCDate() - 1
    new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day
  ) {
    const err = new Error(`Invalid date "${dateString}"`);
    err.statusCode = 400;
    throw err;
  }

  return { start: startUTC, end: endUTC };
};
