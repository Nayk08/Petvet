// Apply `update(row)` to a cached list for optimistic updates (see
// api/optimistic.js). `update` returns the row (unchanged), a new row
// (patched) or null (removed). Lists are cached either as plain arrays or as
// paginated { rows, pagination }; anything else is returned untouched.
export function applyToRows(old, update) {
  if (Array.isArray(old)) return old.map(update).filter(Boolean);
  if (old && Array.isArray(old.rows)) {
    const rows = old.rows.map(update).filter(Boolean);
    const removed = old.rows.length - rows.length;
    return {
      ...old,
      rows,
      pagination:
        old.pagination && removed > 0
          ? { ...old.pagination, total: Math.max(0, (old.pagination.total ?? 0) - removed) }
          : old.pagination,
    };
  }
  return old;
}

export const removeWhere = (idField, id) => (row) =>
  String(row?.[idField]) === String(id) ? null : row;
export const patchWhere = (idField, id, patch) => (row) =>
  String(row?.[idField]) === String(id) ? { ...row, ...patch } : row;
