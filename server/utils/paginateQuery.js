// utils/paginateQuery.js

export async function paginateQuery(
  client,
  { baseQuery, countQuery, values = [], page = 1, limit = 10 },
) {
  const isAll = limit === "all" || limit >= 999999;
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
      page: Number(page),
      limit: isAll ? total : limit,
      total,
      totalPages: isAll ? 1 : Math.ceil(total / limit),
    },
  };
}
