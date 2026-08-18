import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_FILTER_COLUMNS = ["status_name", "is_expired"];
const ALLOWED_SEARCH_COLUMNS = ["product_name", "product_id"];

export default class InventoryModel {
  async getProducts({ page = 1, limit = 10, search = "", filters = {} } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = [];

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        conditions.push(`${key} = ANY($${values.length})`); 
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        const idx = values.length;
        const searchClause = ALLOWED_SEARCH_COLUMNS.map((col) =>
          col === "product_id"
            ? `${col}::text ILIKE $${idx}`
            : `${col} ILIKE $${idx}`,
        ).join(" OR ");
        conditions.push(`(${searchClause})`);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

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
      return res.rows;
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

  async deleteProductById({ product_id }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_products SET is_deleted = true WHERE product_id = $1 RETURNING *`,
        [product_id],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model deleteProductById function");
      throw error;
    } finally {
      client.release();
    }
  }
}
