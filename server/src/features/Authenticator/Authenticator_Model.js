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

}
