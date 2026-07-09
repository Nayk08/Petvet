import pool from "../../../config/db.js";

export default class UsersModel {
  async getUsers() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT * FROM v_users WHERE is_deleted = false",
      );
      return res.rows;
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserById(userId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT * FROM v_users WHERE users_id = $1",
        [userId],
      );
      return res.rows[0];
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Users_Model.js
  async addUser(userData) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT sp_upsert_user_with_roles($1, $2, $3, $4, $5, $6) AS users_id`,
        [
          null, // p_users_id — always null on insert
          userData.user_name,
          userData.user_email,
          userData.user_password,
          userData.level_ids, // matches frontend's "level_ids" key
          null, // p_primary_level_id — unused now, function derives it from role_ids[1]
        ],
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        const err = new Error("Email already exists");
        err.status = 409;
        throw err;
      }
      console.error("error occurred in Users Model:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUser(userId, updatedData) {
    const { user_email, user_name, user_password, level_ids } = updatedData;
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT sp_upsert_user_with_roles($1,$2,$3,$4,$5,$6) AS users_id",
        [userId, user_name, user_email, user_password || null, level_ids, null],
      );
      return { ...updatedData, users_id: result.rows[0].users_id };
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteUser(userId) {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE tbl_users 
      SET is_deleted = true WHERE users_id = $1 RETURNING *`,
        [userId],
      );
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
