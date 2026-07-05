import pool from "../../config/db.js";

// ✅ Class must be defined BEFORE it's used
export default class CommonModel {
  async getNavbarData(role) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT * FROM v_user_permissions WHERE user_level = $1",
        [role],
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
