import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_FILTER_COLUMNS = ["status_name", "is_expired"];
const ALLOWED_SEARCH_COLUMNS = ["product_name", "product_id"];

// Every product row is one physical batch (its own quantity, expiry, price)
// — the list groups batches sharing a product_name into a single row so a
// restock with a new expiry date doesn't read as an unrelated product. The
// grouping happens only here, in the list query: tbl_products, cart
// checkout, and Analytics all keep working against individual batch rows
// exactly as before.
const GROUPED_PRODUCTS_QUERY = `
  SELECT
    product_name,
    SUM(product_quantity)::int AS product_quantity,
    COUNT(*)::int AS batch_count,
    MIN(product_price) AS min_price,
    MAX(product_price) AS max_price,
    (array_agg(product_image ORDER BY date_created DESC)
      FILTER (WHERE product_image IS NOT NULL))[1] AS product_image,
    MIN(product_expiry_date) AS product_expiry_date,
    bool_or(
      product_expiry_date IS NOT NULL
      AND product_expiry_date <= CURRENT_TIMESTAMP
    ) AS is_expired,
    CASE
      WHEN SUM(product_quantity) >= 101 THEN 'High Stock'
      WHEN SUM(product_quantity) BETWEEN 50 AND 100 THEN 'Average Stock'
      WHEN SUM(product_quantity) BETWEEN 1 AND 49 THEN 'Low Stock'
      ELSE 'Out of Stock'
    END AS status_name,
    MAX(product_id) AS product_id,
    MAX(date_created) AS date_created,
    MAX(date_updated) AS date_updated
  FROM tbl_products
  WHERE is_deleted = false
  GROUP BY product_name
`;

export default class InventoryModel {
  // `grouped` is opt-in: the admin Inventory list wants one row per product
  // name with batches merged, but Cart/checkout needs the real, individual
  // batch rows (its own product_id and product_price) to add a specific
  // batch to a sale and deduct its stock correctly — so it keeps getting
  // the flat v_products shape it always has, unchanged.
  async getProducts({
    page = 1,
    limit = 10,
    search = "",
    filters = {},
    grouped = false,
  } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = [];
      const col = grouped ? (key) => `g.${key}` : (key) => key;

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        conditions.push(`${col(key)} = ANY($${values.length})`);
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        const idx = values.length;
        if (grouped) {
          conditions.push(`g.product_name ILIKE $${idx}`);
        } else {
          const searchClause = ALLOWED_SEARCH_COLUMNS.map((c) =>
            c === "product_id"
              ? `${c}::text ILIKE $${idx}`
              : `${c} ILIKE $${idx}`,
          ).join(" OR ");
          conditions.push(`(${searchClause})`);
        }
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      if (grouped) {
        return await paginateQuery(client, {
          baseQuery: `SELECT * FROM (${GROUPED_PRODUCTS_QUERY}) g ${whereClause} ORDER BY g.product_id DESC`,
          countQuery: `SELECT COUNT(*) AS total FROM (${GROUPED_PRODUCTS_QUERY}) g ${whereClause}`,
          values,
          page,
          limit,
        });
      }

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM v_products ${whereClause} ORDER BY product_id DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_products ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getInventory function");
      throw error;
    } finally {
      client.release();
    }
  }

  // The individual batches behind one grouped row — each is still a real,
  // independently editable/deletable tbl_products row (its own product_id).
  async getProductBatches(product_name) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM v_products
         WHERE product_name = $1
         ORDER BY product_expiry_date ASC NULLS LAST, product_id ASC`,
        [product_name],
      );
      return res.rows;
    } catch (error) {
      console.log("Error on Model getProductBatches function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getProductsById(product_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT * FROM v_products WHERE product_id = $1",
        [product_id],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model getInventoryById function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Same product_name AND same product_expiry_date (both null-safe) is
  // treated as restocking an existing batch, not a new one — the price is
  // overwritten with whatever was just typed and the quantity adds on top
  // of what's already there. A different expiry date still creates a
  // genuinely new batch, same as before.
  async addProduct({
    created_by,
    product_image,
    product_name,
    product_quantity,
    product_expiry_date,
    product_price,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT product_id, product_quantity
         FROM tbl_products
         WHERE is_deleted = false
           AND product_name = $1
           AND product_expiry_date IS NOT DISTINCT FROM $2
         FOR UPDATE`,
        [product_name, product_expiry_date || null],
      );

      let rows;
      if (existing.rows.length > 0) {
        const { product_id, product_quantity: currentQty } = existing.rows[0];
        const res = await client.query(
          `UPDATE tbl_products
           SET product_quantity = $1,
               product_price = $2,
               product_image = COALESCE($3, product_image),
               updated_by = $4,
               date_updated = NOW()
           WHERE product_id = $5
           RETURNING *`,
          [
            Number(currentQty) + Number(product_quantity),
            product_price,
            product_image,
            created_by,
            product_id,
          ],
        );
        rows = res.rows;
      } else {
        const res = await client.query(
          `INSERT INTO tbl_products(created_by,
      product_image,
      product_name,
      product_quantity,
      product_expiry_date,
      product_price)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [
            created_by,
            product_image,
            product_name,
            product_quantity,
            product_expiry_date,
            product_price,
          ],
        );
        rows = res.rows;
      }

      await client.query("COMMIT");
      return rows;
    } catch (error) {
      await client.query("ROLLBACK");
      console.log("Error on Model addProduct function");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateProduct({
    updated_by,
    product_image,
    product_name,
    product_quantity,
    product_expiry_date,
    product_price,
    product_id,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_products SET  
      updated_by = $1,
      product_image = $2,
      product_name = $3,
      product_quantity = $4,
      product_expiry_date = $5,
      product_price = $6,
      date_updated = NOW()
      WHERE product_id = $7 RETURNING *`,
        [
          updated_by,
          product_image,
          product_name,
          product_quantity,
          product_expiry_date,
          product_price,
          product_id,
        ],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model updateProduct function");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteProductById({ product_id, deleted_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_products SET is_deleted = true, deleted_by = $2 WHERE product_id = $1 RETURNING *`,
        [product_id, deleted_by],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model deleteProductById function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Bulk version of deleteProductById, scoped to batches already past their
  // expiry date — same soft-delete, just for every match in one query
  // instead of one row at a time.
  async pullExpiredProducts({ deleted_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_products
         SET is_deleted = true, deleted_by = $1
         WHERE is_deleted = false
           AND product_expiry_date IS NOT NULL
           AND product_expiry_date <= CURRENT_TIMESTAMP
         RETURNING product_id, product_name`,
        [deleted_by],
      );
      return res.rows;
    } catch (error) {
      console.log("Error on Model pullExpiredProducts function");
      throw error;
    } finally {
      client.release();
    }
  }
}
