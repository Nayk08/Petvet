import pool from "../../config/db.js";

export default class AuthenticatorModel {
  async findEmail(email) {
    const result = await pool.query(
      "SELECT * FROM tbl_users WHERE user_email = $1 AND is_deleted = false",
      [email],
    );
    return result.rows[0];
  }

  async findUserProfile(usersId) {
    const result = await pool.query("SELECT * FROM v_users WHERE users_id = $1", [
      usersId,
    ]);
    return result.rows[0];
  }

  async findUserLevelId(userLevel) {
    const result = await pool.query(
      "SELECT user_level_id FROM tbl_user_level WHERE LOWER(user_level) = LOWER($1) LIMIT 1",
      [userLevel],
    );
    return result.rows[0]?.user_level_id;
  }

  async registerUser(userName, email, password, userLevelId) {
    const result = await pool.query(
      "INSERT INTO tbl_users (user_name, user_email, user_password, user_level_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [userName, email, password, userLevelId],
    );
    return result.rows[0];
  }
}
