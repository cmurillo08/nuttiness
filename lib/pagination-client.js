// Pure client-side helper shared by all list pages so a delete on the last
// row of a non-first page doesn't strand the user on an empty page.
//
// Rule (phase-12 plan, section 4.3):
//   newTotal  = total - 1
//   newOffset = (offset > 0 && offset >= newTotal) ? Math.max(0, offset - limit) : offset
//
// Callers should only update their offset state when the returned value
// differs from the current offset (that state change re-triggers the
// existing fetch effect); otherwise they should refetch directly to avoid a
// double request.
export function offsetAfterDelete({ offset, limit, total }) {
  const newTotal = total - 1
  if (offset > 0 && offset >= newTotal) {
    return Math.max(0, offset - limit)
  }
  return offset
}
