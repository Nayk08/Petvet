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
    const result = await pool.query(
      "SELECT * FROM v_users WHERE users_id = $1",
      [usersId],
    );
    return result.rows[0];
  }

  async updateUserPicture(users_id, user_picture) {
    const result = await pool.query(
      `UPDATE tbl_users SET user_picture = $1 WHERE users_id = $2 AND is_deleted = false RETURNING user_picture`,
      [user_picture, users_id],
    );
    if (!result.rows.length) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    return result.rows[0].user_picture;
  }

  async findUserLevelId(userLevel) {
    const result = await pool.query(
      `SELECT user_level_id FROM tbl_user_level 
WHERE LOWER(TRIM(user_level)) = LOWER(TRIM($1)) 
LIMIT 1`,
      [userLevel],
    );
    return result.rows[0]?.user_level_id;
  }

  async registerUser(userName, email, password, userLevelId) {
    // RETURNING only safe columns — never user_password (even hashed, it
    // has no business leaving the server in an API response).
    const result = await pool.query(
      `INSERT INTO tbl_users (user_name, user_email, user_password, user_level_id)
       VALUES ($1, $2, $3, $4)
       RETURNING users_id, user_name, user_email, user_level_id, date_created`,
      [userName, email, password, userLevelId],
    );
    return result.rows[0];
  }
}
