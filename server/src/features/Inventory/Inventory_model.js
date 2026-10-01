import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_FILTER_COLUMNS = [
  "status_name",
  "is_expired",
  "expiring_soon",
  "category_name",
];
const ALLOWED_SEARCH_COLUMNS = ["product_name", "product_id"];

// Every product row is one physical batch (its own quantity, expiry, price)
// — the list groups batches sharing a product_name into a single row so a
// restock with a new expiry date doesn't read as an unrelated product. The
// grouping happens only here, in the list query: tbl_products, cart
// checkout, and Analytics all keep working against individual batch rows
// exactly as before.
const GROUPED_PRODUCTS_QUERY = `
  SELECT
    p.product_name,
    SUM(p.product_quantity)::int AS product_quantity,
    COUNT(*)::int AS batch_count,
    MIN(p.product_price) AS min_price,
    MAX(p.product_price) AS max_price,
    (array_agg(p.product_image ORDER BY p.date_created DESC)
      FILTER (WHERE p.product_image IS NOT NULL))[1] AS product_image,
    MIN(p.product_expiry_date) AS product_expiry_date,
    bool_or(
      p.product_expiry_date IS NOT NULL
      AND p.product_expiry_date <= CURRENT_TIMESTAMP
    ) AS is_expired,
    bool_or(
      p.product_expiry_date IS NOT NULL
      AND p.product_expiry_date > CURRENT_TIMESTAMP
      AND p.product_expiry_date <= CURRENT_TIMESTAMP + INTERVAL '5 months'
    ) AS expiring_soon,
    CASE
      WHEN SUM(p.product_quantity) >= 101 THEN 'High Stock'
      WHEN SUM(p.product_quantity) BETWEEN 50 AND 100 THEN 'Average Stock'
      WHEN SUM(p.product_quantity) BETWEEN 1 AND 49 THEN 'Low Stock'
      ELSE 'Out of Stock'
    END AS status_name,
    (array_agg(c.category_name ORDER BY p.date_created DESC)
      FILTER (WHERE c.category_name IS NOT NULL))[1] AS category_name,
    MAX(p.product_id) AS product_id,
    MAX(p.date_created) AS date_created,
    MAX(p.date_updated) AS date_updated
  FROM tbl_products p
  LEFT JOIN tbl_product_categories c ON c.category_id = p.category_id
  WHERE p.is_deleted = false
  GROUP BY p.product_name
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
    category_id,
  }) {
    // "" (a blank date input) is not valid input for a timestamp column —
    // only NULL represents "no expiry set". Normalized once here so both
    // the match query below and the INSERT agree on what "no expiry" means.
    const expiryDate = product_expiry_date || null;
    const categoryId = category_id || null;

    const client = await pool.connect();
    try {
      // FIXED: `SELECT ... FOR UPDATE` locks nothing when it matches zero
      // rows, so two concurrent "add this new product" requests could both
      // see "no existing batch" and both INSERT — silently splitting one
      // logical batch into two. `uq_products_name_expiry` (added alongside
      // this fix) makes the DB itself reject the second INSERT; on that
      // conflict, retry once so the loser merges into the row the winner
      // just created instead of failing outright.
      for (let attempt = 1; attempt <= 2; attempt++) {
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
                   category_id = $4,
                   updated_by = $5,
                   date_updated = NOW()
               WHERE product_id = $6
               RETURNING *`,
              [
                Number(currentQty) + Number(product_quantity),
                product_price,
                product_image,
                categoryId,
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
          product_price,
          category_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
              [
                created_by,
                product_image,
                product_name,
                product_quantity,
                expiryDate,
                product_price,
                categoryId,
              ],
            );
            rows = res.rows;
          }

          await client.query("COMMIT");
          return rows;
        } catch (error) {
          await client.query("ROLLBACK");
          if (error.code === "23505" && error.constraint === "uq_products_name_expiry" && attempt < 2) {
            continue; // another transaction won the race — retry and merge into its row
          }
          throw error;
        }
      }
    } catch (error) {
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
    category_id,
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
      category_id = $7,
      date_updated = NOW()
      WHERE product_id = $8 RETURNING *`,
        [
          updated_by,
          product_image,
          product_name,
          product_quantity,
          product_expiry_date || null, // "" is invalid for a timestamp column
          product_price,
          category_id || null,
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

  // ── Categories ─────────────────────────────────────────
  async getProductCategories() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT category_id, category_name
         FROM tbl_product_categories
         WHERE is_deleted = false
         ORDER BY category_name ASC`,
      );
      return res.rows;
    } catch (error) {
      console.log("Error on Model getProductCategories function");
      throw error;
    } finally {
      client.release();
    }
  }

  async addProductCategory({ category_name, created_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO tbl_product_categories (category_name, created_by)
         VALUES ($1, $2)
         RETURNING category_id, category_name`,
        [category_name, created_by],
      );
      return res.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        const err = new Error("This category already exists");
        err.status = 409;
        throw err;
      }
      console.log("Error on Model addProductCategory function");
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
      // Same race as addProduct's new-batch path, and guarded by the same
      // uq_products_name_expiry constraint — retry once on conflict so a
      // losing concurrent request merges into the winner's row instead of
      // failing outright.
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          return await this._addQuantityAttempt(client, {
            product_id,
            quantity,
            product_price,
            newExpiry,
            updated_by,
          });
        } catch (error) {
          if (error.code === "23505" && error.constraint === "uq_products_name_expiry" && attempt < 2) {
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      console.log("Error on Model addQuantity function");
      throw error;
    } finally {
      client.release();
    }
  }

  async _addQuantityAttempt(client, { product_id, quantity, product_price, newExpiry, updated_by }) {
    try {
      await client.query("BEGIN");

      const currentRes = await client.query(
        `SELECT product_name, product_expiry_date, product_image, category_id
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
              product_quantity, product_expiry_date, product_price, category_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [
              updated_by,
              current.product_image,
              current.product_name,
              quantity,
              newExpiry,
              product_price,
              current.category_id,
            ],
          );
          result = res.rows[0];
        }
      }

      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  // Archive tab — the soft-deleted counterpart to getProducts. Queries
  // tbl_products directly (not v_products, which hardcodes
  // `WHERE is_deleted = false` and so can never surface these rows) but
  // mirrors the same computed status_name/is_expired shape so the existing
  // Inventory columns config renders it without changes.
  async getArchivedProducts({ page = 1, limit = 10, search = "" } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = ["p.is_deleted = true"];

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(`p.product_name ILIKE $${values.length}`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        baseQuery: `
          SELECT
            p.product_id,
            p.product_name,
            p.product_image,
            p.product_quantity,
            p.product_price,
            p.product_expiry_date,
            (p.product_expiry_date IS NOT NULL
              AND p.product_expiry_date <= CURRENT_TIMESTAMP) AS is_expired,
            (p.product_expiry_date IS NOT NULL
              AND p.product_expiry_date > CURRENT_TIMESTAMP
              AND p.product_expiry_date <= CURRENT_TIMESTAMP + INTERVAL '5 months'
            ) AS expiring_soon,
            CASE
              WHEN p.product_quantity >= 101 THEN 'High Stock'
              WHEN p.product_quantity BETWEEN 50 AND 100 THEN 'Average Stock'
              WHEN p.product_quantity BETWEEN 1 AND 49 THEN 'Low Stock'
              ELSE 'Out of Stock'
            END AS status_name,
            p.created_by,
            p.date_created,
            p.updated_by,
            p.date_updated,
            p.deleted_by,
            p.category_id,
            c.category_name
          FROM tbl_products p
          LEFT JOIN tbl_product_categories c ON c.category_id = p.category_id
          ${whereClause}
          ORDER BY p.date_updated DESC NULLS LAST, p.product_id DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM tbl_products p ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getArchivedProducts function");
      throw error;
    } finally {
      client.release();
    }
  }

  async restoreProduct({ product_id, updated_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_products
         SET is_deleted = false, deleted_by = NULL, updated_by = $2, date_updated = NOW()
         WHERE product_id = $1 AND is_deleted = true
         RETURNING *`,
        [product_id, updated_by],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model restoreProduct function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Hard delete — only ever called on an already-archived row (the WHERE
  // clause is the actual guarantee, not just the route it's wired behind).
  // If this product was ever sold, tbl_cart_items still references it
  // (ON DELETE NO ACTION), so Postgres itself blocks the delete rather than
  // silently orphaning old sales records — caught below and turned into a
  // message instead of a raw FK error.
  async permanentlyDeleteProduct({ product_id }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `DELETE FROM tbl_products WHERE product_id = $1 AND is_deleted = true RETURNING product_id`,
        [product_id],
      );
      return res.rows[0];
    } catch (error) {
      if (error.code === "23503") {
        const err = new Error(
          "This product can't be permanently deleted — it still has sales history. It will remain archived instead.",
        );
        err.status = 409;
        throw err;
      }
      console.log("Error on Model permanentlyDeleteProduct function");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteProductById({ product_id, deleted_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_products
         SET is_deleted = true, deleted_by = $2, date_updated = NOW()
         WHERE product_id = $1
         RETURNING *`,
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
         SET is_deleted = true, deleted_by = $1, date_updated = NOW()
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
