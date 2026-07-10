// utils/paginateQuery.js


export async function paginateQuery(
  client,
  { baseQuery, countQuery, params = [], page = 1, limit = 10 },
) {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.max(1, parseInt(limit) || 10);
  const offset = (safePage - 1) * safeLimit;

  const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const dataResult = await client.query(paginatedQuery, [
    ...params,
    safeLimit,
    offset,
  ]);

  const countResult = await client.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  return {
    rows: dataResult.rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}
