import pool from "../../../../config/db.js";
export default class PermissionModel {
  /**
   * Returns every active module, LEFT JOINed against tbl_module_access
   * for the given role. Modules with no saved permission row yet
   * come back with all flags defaulted to false via COALESCE.
   */
  async getModulesWithPermissions(userLevelId) {
    const query = `
      SELECT
        m.user_module_id,
        m.module_name,
        m.module_code,
        m.route,
        m.parent_module_id,
        m.sort_order,
        COALESCE(ma.can_view, false)   AS can_view,
        COALESCE(ma.can_create, false) AS can_create,
        COALESCE(ma.can_edit, false)   AS can_edit,
        COALESCE(ma.can_delete, false) AS can_delete,
        COALESCE(ma.can_export, false) AS can_export
      FROM tbl_user_module m
      LEFT JOIN tbl_module_access ma
        ON ma.user_module_id = m.user_module_id
        AND ma.user_level_id = $1
      WHERE m.is_active = true
      ORDER BY m.sort_order ASC, m.user_module_id ASC;
    `;
    const result = await pool.query(query, [userLevelId]);
    return result.rows;
  }

  async getModuleCode(userModuleId) {
    const { rows } = await pool.query(
      `SELECT module_code FROM tbl_user_module WHERE user_module_id = $1`,
      [userModuleId],
    );
    return rows[0]?.module_code;
  }

  async getUserLevels() {
    const query = `
      SELECT user_level_id, user_level, description
      FROM tbl_user_level
      WHERE is_deleted = false AND is_active = true
      ORDER BY user_level ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Upserts a single permission cell. `field` is pre-validated against
   * an allowlist in the service layer before it ever reaches this query,
   * since column names can't be parameterized with $1-style placeholders.
   */
  async upsertPermission({
    userLevelId,
    userModuleId,
    field,
    value,
    updatedBy,
  }) {
    const query = `
      INSERT INTO tbl_module_access
        (user_level_id, user_module_id, ${field}, created_by, date_created)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_level_id, user_module_id)
      DO UPDATE SET
        ${field} = EXCLUDED.${field},
        updated_by = $4,
        date_updated = NOW()
      RETURNING *;
    `;
    const result = await pool.query(query, [
      userLevelId,
      userModuleId,
      value,
      updatedBy,
    ]);
    return result.rows[0];
  }
}
