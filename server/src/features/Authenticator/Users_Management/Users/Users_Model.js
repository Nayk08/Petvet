import pool from "../../../../config/db.js";

import { paginateQuery } from "../../../../../utils/paginateQuery.js";
const ALLOWED_FILTER_COLUMNS = ["user_level", "is_active"];
const ALLOWED_SEARCH_COLUMNS = ["user_name", "user_email"];
export default class UsersModel {
  async getUsers({ page = 1, limit = 10, search = "", filters = {} } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = ["is_deleted = false"];

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        if (key === "is_active") {
          const valueList = value.split(",").map((v) => v === "true");
          values.push(valueList);
          conditions.push(`is_active = ANY($${values.length})`);
          continue;
        }

        // user_level (varchar, multi-select)
        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;
        values.push(valueList);
        conditions.push(`${key} = ANY($${values.length})`);
      }
      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        const idx = values.length;
        const searchClause = ALLOWED_SEARCH_COLUMNS.map(
          (col) => `${col} ILIKE $${idx}`,
        ).join(" OR ");
        conditions.push(`(${searchClause})`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM v_users ${whereClause} ORDER BY users_id`,
        countQuery: `SELECT COUNT(*) AS total FROM v_users ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserById(userId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT * FROM v_users WHERE users_id = $1",
        [userId],
      );
      return res.rows[0];
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Users_Model.js
  async addUser(userData, createdBy) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT sp_upsert_user_with_roles($1, $2, $3, $4, $5, $6) AS users_id`,
        [
          null, // p_users_id — always null on insert
          userData.user_name,
          userData.user_email,
          userData.user_password,
          userData.level_ids, // matches frontend's "level_ids" key
          null, // p_primary_level_id — unused now, function derives it from role_ids[1]
        ],
      );
      const { users_id } = result.rows[0];
      // The stored proc doesn't set created_by, so stamp it separately.
      await client.query(
        `UPDATE tbl_users SET created_by = $1 WHERE users_id = $2`,
        [createdBy, users_id],
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        const err = new Error("Email already exists");
        err.status = 409;
        throw err;
      }
      console.error("error occurred in Users Model:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUser(userId, updatedData, updatedBy) {
    const { user_email, user_name, user_password, level_ids } = updatedData;
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT sp_upsert_user_with_roles($1,$2,$3,$4,$5,$6) AS users_id",
        [userId, user_name, user_email, user_password || null, level_ids, null],
      );
      // The stored proc doesn't set updated_by, so stamp it separately.
      await client.query(
        `UPDATE tbl_users SET updated_by = $1, date_updated = NOW() WHERE users_id = $2`,
        [updatedBy, userId],
      );
      return { ...updatedData, users_id: result.rows[0].users_id };
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteUser(userId, deletedBy) {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE tbl_users
      SET is_deleted = true, deleted_by = $2 WHERE users_id = $1 RETURNING *`,
        [userId, deletedBy],
      );
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
