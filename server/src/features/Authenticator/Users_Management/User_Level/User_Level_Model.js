import pool from "../../../../config/db.js";
import { paginateQuery } from "../../../../../utils/paginateQuery.js";

const ALLOWED_FILTER_COLUMNS = ["level_name", "status"];
const ALLOWED_SEARCH_COLUMNS = ["level_name"];

export default class UserLevelModel {
  async getUserLevel({ page = 1, limit = 10, search = "", filters = {} } = {}) {
    const client = await pool.connect();

    try {
      const values = [];
      const conditions = ["is_deleted = false"];

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;
        values.push(value);
        conditions.push(`${key} = $${values.length}`);
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
        baseQuery: `SELECT * FROM tbl_user_level ${whereClause} ORDER BY user_level_id`,
        countQuery: `SELECT COUNT(*) AS total FROM tbl_user_level ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model Role", error);
      throw error;
    } finally {
      client.release(); // ✅ always release
    }
  }

  async getUserLevelById(userLevelId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM tbl_user_level WHERE user_level_id = $1`,
        [userLevelId],
      );
      return result.rows;
    } catch (error) {
      console.log("Error on Model getUserLevelById function");
      throw error;
    } finally {
      client.release();
    }
  }

  async addUserLevel(userLevel, description, createdBy) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO tbl_user_level (user_level, description, created_by) VALUES($1,$2,$3) RETURNING *`,
        [userLevel, description, createdBy],
      );
      return result.rows;
    } catch (error) {
      console.log("Error on Model addUserLevel function");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUserLevel(userLevelId, userLevel, description, updatedBy) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE tbl_user_level
       SET user_level = $1, description = $2, updated_by = $3, date_updated = NOW()
       WHERE user_level_id = $4
       RETURNING *`,
        [userLevel, description, updatedBy, userLevelId],
      );
      return result.rows;
    } catch (error) {
      console.log("Error on Model updateUserLevel function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getRoleNameAndActiveUsers(userLevelId) {
    const result = await pool.query(
      `SELECT ul.user_level,
              (SELECT COUNT(*) FROM tbl_user_level_assignments a
               JOIN tbl_users u ON u.users_id = a.users_id AND u.is_deleted = false
               WHERE a.user_level_id = ul.user_level_id AND a.is_active)::int AS active_users
       FROM tbl_user_level ul
       WHERE ul.user_level_id = $1 AND ul.is_deleted IS NOT TRUE`,
      [userLevelId],
    );
    return result.rows[0];
  }

  async deleteUserLevel(userLevelId, deletedBy) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        // is_active = false too, so v_user_permissions stops granting it.
        `UPDATE tbl_user_level
          SET is_deleted = true, is_active = false, deleted_by = $2
          WHERE user_level_id = $1 AND is_deleted IS NOT TRUE
            RETURNING *`,
        [userLevelId, deletedBy],
      );
      return result.rows;
    } catch (error) {
      console.log("Error on Model deleteUserLevel fucntion", error);
      throw error;
    } finally {
      client.release();
    }
  }
}
