import pool from "../../../../config/db.js";

import { paginateQuery } from "../../../../../utils/paginateQuery.js";
const ALLOWED_FILTER_COLUMNS = ["user_level", "is_active"];
const ALLOWED_SEARCH_COLUMNS = ["user_name", "user_email"];
export default class UsersModel {
  async getUsers({ page = 1, limit = 10, search = "", filters = {} } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = ["is_deleted = false"];

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        if (key === "is_active") {
          const valueList = value.split(",").map((v) => v === "true");
          values.push(valueList);
          conditions.push(`is_active = ANY($${values.length})`);
          continue;
        }

        // user_level (varchar, multi-select)
        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;
        values.push(valueList);
        conditions.push(`${key} = ANY($${values.length})`);
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
        baseQuery: `SELECT * FROM v_users ${whereClause} ORDER BY users_id`,
        countQuery: `SELECT COUNT(*) AS total FROM v_users ${whereClause}`,
        values,
        page,
        limit,
      });
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
  async addUser(userData, createdBy) {
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
      const { users_id } = result.rows[0];
      // The stored proc doesn't set created_by, so stamp it separately.
      await client.query(
        `UPDATE tbl_users SET created_by = $1 WHERE users_id = $2`,
        [createdBy, users_id],
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

  async updateUser(userId, updatedData, updatedBy) {
    const { user_email, user_name, user_password, level_ids } = updatedData;
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT sp_upsert_user_with_roles($1,$2,$3,$4,$5,$6) AS users_id",
        [userId, user_name, user_email, user_password || null, level_ids, null],
      );
      // The stored proc doesn't set updated_by, so stamp it separately.
      await client.query(
        `UPDATE tbl_users SET updated_by = $1, date_updated = NOW() WHERE users_id = $2`,
        [updatedBy, userId],
      );
      // Never echo user_password (hashed or not) back in the response.
      const { user_password: _omit, ...safeData } = updatedData;
      return { ...safeData, users_id: result.rows[0].users_id };
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getArchivedUsers({ page = 1, limit = 10, search = "" } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = ["u.is_deleted = true"];

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        const idx = values.length;
        conditions.push(
          `(u.user_name ILIKE $${idx} OR u.user_email ILIKE $${idx})`,
        );
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        baseQuery: `
          SELECT u.users_id, u.user_name, u.user_email, u.user_picture,
                 u.user_level_id, ul.user_level, u.date_created, u.date_updated,
                 u.deleted_by
          FROM tbl_users u
          JOIN tbl_user_level ul ON u.user_level_id = ul.user_level_id
          ${whereClause}
          ORDER BY u.users_id DESC`,
        countQuery: `
          SELECT COUNT(*) AS total
          FROM tbl_users u
          JOIN tbl_user_level ul ON u.user_level_id = ul.user_level_id
          ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async restoreUser(userId, updatedBy) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_users
         SET is_deleted = false, deleted_by = NULL, updated_by = $2, date_updated = NOW()
         WHERE users_id = $1 AND is_deleted = true
         RETURNING users_id`,
        [userId, updatedBy],
      );
      return res.rows[0];
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Hard delete — only ever called on an already-archived row (the WHERE
  // clause is the actual guarantee, not just the route it's wired behind).
  // tbl_appointments.assigned_staff_id references users_id with
  // ON DELETE NO ACTION, so Postgres blocks this rather than silently
  // orphaning appointment history — caught below as a friendly message.
  async permanentlyDeleteUser(userId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `DELETE FROM tbl_users WHERE users_id = $1 AND is_deleted = true RETURNING users_id`,
        [userId],
      );
      return res.rows[0];
    } catch (error) {
      if (error.code === "23503") {
        const err = new Error(
          "This user can't be permanently deleted — they still have appointment history. They will remain archived instead.",
        );
        err.status = 409;
        throw err;
      }
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // True only when the target user currently holds the Admin role AND no
  // other active, non-deleted user also holds it — i.e. deleting them would
  // leave the clinic with zero Admin accounts. Since self-registration has
  // been removed entirely, that would be an unrecoverable lockout.
  async isLastAdmin(userId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT
           EXISTS (
             SELECT 1 FROM tbl_user_level_assignments a
             JOIN tbl_user_level ul ON ul.user_level_id = a.user_level_id
             WHERE a.users_id = $1 AND a.is_active = true AND ul.user_level = 'Admin'
           ) AS target_is_admin,
           (
             SELECT COUNT(DISTINCT u.users_id) FROM tbl_users u
             JOIN tbl_user_level_assignments a ON a.users_id = u.users_id AND a.is_active = true
             JOIN tbl_user_level ul ON ul.user_level_id = a.user_level_id
             WHERE ul.user_level = 'Admin' AND u.is_deleted = false AND u.users_id != $1
           ) AS other_admin_count`,
        [userId],
      );
      const { target_is_admin, other_admin_count } = res.rows[0];
      return target_is_admin && Number(other_admin_count) === 0;
    } catch (error) {
      console.log(`error occurred in Users Model isLastAdmin: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Same lockout this guards against in deleteUser, but for the edit path:
  // stripping "Admin" off the last Admin's role list is just as fatal as
  // deleting them outright.
  async isLastAdminAfterRoleChange(userId, newLevelIds) {
    const client = await pool.connect();
    try {
      const adminLevelRes = await client.query(
        `SELECT user_level_id FROM tbl_user_level WHERE user_level = 'Admin'`,
      );
      const adminLevelId = adminLevelRes.rows[0]?.user_level_id;
      if (!adminLevelId) return false; // no Admin level configured — nothing to protect

      const keepsAdmin = (newLevelIds ?? [])
        .map(String)
        .includes(String(adminLevelId));
      if (keepsAdmin) return false;

      return this.isLastAdmin(userId);
    } finally {
      client.release();
    }
  }

  async deleteUser(userId, deletedBy) {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE tbl_users
      SET is_deleted = true, deleted_by = $2, date_updated = NOW()
      WHERE users_id = $1 RETURNING *`,
        [userId, deletedBy],
      );
    } catch (error) {
      console.log(`error occurred in Users Model: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
