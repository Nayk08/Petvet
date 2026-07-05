import pool from "../../../config/db.js";

export default class UsersModel {
  async getUsers() {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM v_users`);
      return res.rows;
    } catch (error) {
      console.log(`error occured on Users Model ${error}`);
      throw error;
    }
  }
}
