import pool from "../../config/db.js";

export default class CommonModel {
  async getNavbarData(levelIds) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT
           user_module_id,
           module_code,
           module_name,
           parent_module_id,
           sort_order,
           route,
           bool_or(can_view)   AS can_view,
           bool_or(can_create) AS can_create,
           bool_or(can_edit)   AS can_edit,
           bool_or(can_delete) AS can_delete,
           bool_or(can_export) AS can_export
         FROM v_user_permissions
         WHERE user_level_id = ANY($1::int[])
         GROUP BY user_module_id, module_code, module_name, parent_module_id, sort_order, route
         HAVING bool_or(can_view) = true
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
