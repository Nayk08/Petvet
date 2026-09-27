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
    // "" (a blank date input) is not valid input for a timestamp column —
    // only NULL represents "no expiry set". Normalized once here so both
    // the match query below and the INSERT agree on what "no expiry" means.
    const expiryDate = product_expiry_date || null;

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
        [product_name, expiryDate],
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
            expiryDate,
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
          product_expiry_date || null, // "" is invalid for a timestamp column
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

  // Dedicated restock action for one specific batch — adds to its existing
  // quantity and always overwrites its price with whatever's submitted.
  // Expiry is treated as the batch's identity, same as addProduct: keeping
  // it unchanged just restocks this row in place, but entering a DIFFERENT
  // expiry means the new stock is a genuinely different lot — this batch's
  // own quantity/price/expiry are left untouched, and the new quantity
  // either merges into an existing batch at that expiry or creates a new
  // one. Mutating this batch's expiry in place would silently merge two
  // different lots together and make the earlier one unrecoverable for
  // expiry-based removal (Analytics' "Remove Expired").
  async addQuantity({
    product_id,
    quantity,
    product_price,
    product_expiry_date,
    updated_by,
  }) {
    const newExpiry = product_expiry_date || null;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const currentRes = await client.query(
        `SELECT product_name, product_expiry_date, product_image
         FROM tbl_products
         WHERE product_id = $1 AND is_deleted = false
         FOR UPDATE`,
        [product_id],
      );
      if (!currentRes.rows.length) {
        const err = new Error("Product not found");
        err.status = 404;
        throw err;
      }
      const current = currentRes.rows[0];
      // Raw string from db.js's TIMESTAMP type parser ("YYYY-MM-DD HH:mm:ss"),
      // never a Date — slicing avoids the timezone drift new Date(...) would
      // introduce (see AddProductModal.jsx's expiry-display fix for why).
      const currentExpiry = current.product_expiry_date
        ? current.product_expiry_date.slice(0, 10)
        : null;

      let result;
      if (currentExpiry === newExpiry) {
        const res = await client.query(
          `UPDATE tbl_products
           SET product_quantity = product_quantity + $1,
               product_price = $2,
               updated_by = $3,
               date_updated = NOW()
           WHERE product_id = $4
           RETURNING *`,
          [quantity, product_price, updated_by, product_id],
        );
        result = res.rows[0];
      } else {
        const matchRes = await client.query(
          `SELECT product_id, product_quantity
           FROM tbl_products
           WHERE is_deleted = false
             AND product_name = $1
             AND product_expiry_date IS NOT DISTINCT FROM $2
             AND product_id != $3
           FOR UPDATE`,
          [current.product_name, newExpiry, product_id],
        );

        if (matchRes.rows.length > 0) {
          const { product_id: matchId, product_quantity: matchQty } =
            matchRes.rows[0];
          const res = await client.query(
            `UPDATE tbl_products
             SET product_quantity = $1,
                 product_price = $2,
                 updated_by = $3,
                 date_updated = NOW()
             WHERE product_id = $4
             RETURNING *`,
            [
              Number(matchQty) + Number(quantity),
              product_price,
              updated_by,
              matchId,
            ],
          );
          result = res.rows[0];
        } else {
          const res = await client.query(
            `INSERT INTO tbl_products(created_by, product_image, product_name,
              product_quantity, product_expiry_date, product_price)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [
              updated_by,
              current.product_image,
              current.product_name,
              quantity,
              newExpiry,
              product_price,
            ],
          );
          result = res.rows[0];
        }
      }

      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      console.log("Error on Model addQuantity function");
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
