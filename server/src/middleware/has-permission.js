// middleware/has-permission.js
import pool from "../config/db.js"; // adjust path to your actual pool

export default function hasPermission(moduleCode, action = "can_view") {
  return async (req, res, next) => {
    if (!req.session?.user?.level_ids?.length) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM v_user_permissions
         WHERE user_level_id = ANY($1::int[]) AND module_code = $2
         AND ${action} = true
         LIMIT 1`,
        [req.session.user.level_ids, moduleCode],
      );

      if (rows.length === 0) {
        return res
          .status(403)
          .json({ error: "Forbidden: insufficient permission" });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
