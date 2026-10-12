// utils/paginateQuery.js

// page/limit arrive straight from the query string: "-1", "abc", "0".
// Clamp them so a bad URL can't reach SQL as a negative OFFSET or NaN LIMIT
// (that was a 500). "all" (or the legacy huge number) means no paging.
const MAX_LIMIT = 1000;
export function normalizePaging(page, limit) {
  const isAll = limit === "all" || Number(limit) >= 999999;
  const parsedLimit = Number.parseInt(limit, 10);
  const parsedPage = Number.parseInt(page, 10);
  return {
    isAll,
    limit: isAll ? null : Math.min(MAX_LIMIT, parsedLimit > 0 ? parsedLimit : 10),
    page: parsedPage > 0 ? parsedPage : 1,
  };
}

export async function paginateQuery(
  client,
  { baseQuery, countQuery, values = [], page: rawPage = 1, limit: rawLimit = 10 },
) {
  const { isAll, limit, page } = normalizePaging(rawPage, rawLimit);
  let dataQuery = baseQuery;
  const dataValues = [...values];

  if (!isAll) {
    const offset = (page - 1) * limit;
    dataValues.push(limit, offset);
    dataQuery += ` LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`;
  }

  const [dataResult, countResult] = await Promise.all([
    client.query(dataQuery, dataValues),
    client.query(countQuery, values), // count uses only the WHERE values, no limit/offset
  ]);

  const total = parseInt(countResult.rows[0].total, 10);

  return {
    rows: dataResult.rows,
    pagination: {
      page,
      limit: isAll ? total : limit,
      total,
      totalPages: isAll ? 1 : Math.ceil(total / limit),
    },
  };
}
