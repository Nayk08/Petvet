import pool from "../../config/db.js";

export default class AuthenticatorModel {
  async findEmail(email) {
    const result = await pool.query(
      "SELECT * FROM tbl_users WHERE user_email = $1 AND is_deleted = false",
      [email],
    );
    return result.rows[0];
  }

  async registerUser(userName, email, password) {
    const result = await pool.query(
      "INSERT INTO tbl_users (user_name, user_email, user_password) VALUES ($1, $2, $3) RETURNING *",
      [userName, email, password],
    );
    return result.rows[0];
  }
}
