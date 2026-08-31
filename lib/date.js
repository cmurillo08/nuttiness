// Calendar-date helpers for `purchased_at` and similar "calendar day" values.
//
// These values represent a calendar date (e.g. "purchased on Aug 29"), not a
// precise instant, and must always be parsed/formatted in UTC. Never route
// them through local-timezone conversion (`new Date(...).toLocaleDateString()`
// on the raw instant) — that is what causes the off-by-one-day bug this
// module fixes.
//
// `created_at` / `updated_at` timestamps are true instants and must keep
// using local-time formatting; they do NOT go through this helper.

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

function pad2(n) {
  return String(n).padStart(2, "0")
}

/**
 * Normalize a Date / ISO string / "YYYY-MM-DD" value into a "YYYY-MM-DD"
 * string suitable for an <input type="date">. Returns "" for null/invalid.
 */
export function toCalendarDateInput(value) {
  if (value === null || value === undefined || value === "") return ""

  if (typeof value === "string" && DATE_ONLY_RE.test(value)) {
    return value
  }

  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ""

  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

/**
 * Convert a "YYYY-MM-DD" (or Date/ISO) input value into the canonical
 * "YYYY-MM-DDT00:00:00.000Z" calendar-date payload sent to the API.
 * Returns null for null/invalid input.
 */
export function toCalendarDateISO(inputValue) {
  const dateOnly = toCalendarDateInput(inputValue)
  if (!dateOnly) return null
  return `${dateOnly}T00:00:00.000Z`
}

/**
 * User-facing display string for a calendar-date value, built from UTC date
 * parts. Returns "" for null/invalid input.
 */
export function formatCalendarDate(value) {
  const dateOnly = toCalendarDateInput(value)
  if (!dateOnly) return ""
  const [year, month, day] = dateOnly.split("-").map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.toLocaleDateString(undefined, { timeZone: "UTC" })
}

/**
 * Server-side request normalization for a `purchased_at`-shaped body field:
 * date-only strings ("YYYY-MM-DD") become UTC-midnight ISO datetimes so the
 * stored value always matches the calendar-date convention above. A missing
 * field is left untouched so a schema validator's `required` check still
 * fires; anything else that isn't a valid ISO date-time is rejected.
 *
 * Shared by the expenses create/update routes (no DOM dependency, safe to
 * import from both client components and server route handlers).
 *
 * @param {object} body - the parsed request body
 * @returns {{ body: object, error: string|null }}
 */
export function normalizePurchasedAt(body) {
  const { purchased_at } = body
  if (purchased_at === undefined) {
    return { body, error: null }
  }
  if (typeof purchased_at !== "string") {
    return { body, error: "purchased_at must be a valid date" }
  }
  if (DATE_ONLY_RE.test(purchased_at)) {
    return { body: { ...body, purchased_at: `${purchased_at}T00:00:00.000Z` }, error: null }
  }
  if (ISO_DATE_TIME_RE.test(purchased_at) && !Number.isNaN(new Date(purchased_at).getTime())) {
    return { body, error: null }
  }
  return { body, error: "purchased_at must be a valid date" }
}
