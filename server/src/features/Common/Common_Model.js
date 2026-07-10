import pool from "../../config/db.js";

// ✅ Class must be defined BEFORE it's used
export default class CommonModel {
  // commonModel.js
  async getNavbarData(levelIds) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM v_user_permissions
       WHERE user_level_id = ANY($1::int[])
       ORDER BY user_module_id ASC`,
        [levelIds],
      );
      return res.rows;
    } catch (err) {
      console.error("Error fetching navbar data:", err);
      throw err;
    } finally {
      client.release();
    }
  }
  async getCategoryUserLevel() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT user_level_id, user_level FROM tbl_user_level WHERE is_deleted = 'false'",
      );
      return res.rows;
    } catch (err) {
      console.error("Error fetching navbar data:", err);
      throw err;
    } finally {
      client.release();
    }
  }
}
