import pool from "../../../config/db.js";
import { paginateQuery } from "../../../../utils/paginateQuery.js";

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

  async addUserLevel(userLevel, description) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO tbl_user_level (user_level, description) VALUES($1,$2) RETURNING *`,
        [userLevel, description],
      );
      return result.rows;
    } catch (error) {
      console.log("Error on Model addUserLevel function");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUserLevel(userLevelId, userLevel, description) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE tbl_user_level
       SET user_level = $1, description = $2 , date_updated = NOW()
       WHERE user_level_id = $3
       RETURNING *`,
        [userLevel, description, userLevelId],
      );
      return result.rows;
    } catch (error) {
      console.log("Error on Model updateUserLevel function");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteUserLevel(userLevelId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE tbl_user_level
          SET is_deleted = 'true' WHERE user_level_id = $1 
            RETURNING *`,
        [userLevelId],
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
