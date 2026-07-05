import pool from "../../../config/db.js";
export default class UserLevelModel {
  async getUserLevel() {
    const client = await pool.connect();

    try {
      const result = await client.query(`SELECT * FROM tbl_user_level`);
      return result.rows;
    } catch (error) {
      console.log("Error on Model Role", error);
      throw error;
    } finally {
      client.release(); // ✅ always release
    }
  }
}
