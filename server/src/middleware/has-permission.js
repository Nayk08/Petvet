// middleware/has-permission.js
import pool from "../config/db.js"; // adjust path to your actual pool

const ALLOWED_ACTIONS = new Set([
  "can_view",
  "can_create",
  "can_edit",
  "can_delete",
  "can_export",
]);

// `moduleCode` may be an array: the action on ANY of those modules is enough
// (e.g. product sales charts shown in both Inventory and Analytics).
export default function hasPermission(moduleCode, ...actions) {
  const moduleCodes = [moduleCode].flat();
  if (actions.length === 0) actions = ["can_view"];
  for (const action of actions) {
    if (!ALLOWED_ACTIONS.has(action)) {
      throw new Error(`hasPermission: invalid action "${action}"`);
    }
  }
  const conditions = actions.map((action) => `${action} = true`).join(" AND ");

  return async (req, res, next) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Deliberately re-derives the user's CURRENT active roles from the DB
      // on every request instead of trusting req.session.user.level_ids
      // (cached at login) — otherwise revoking/demoting a user's role
      // wouldn't take effect until they logged out and back in, leaving an
      // already-open session with stale, higher-than-intended access.
      const { rows } = await pool.query(
        `SELECT 1 FROM v_user_permissions vp
         JOIN tbl_user_level_assignments a
           ON a.user_level_id = vp.user_level_id AND a.is_active = true
         -- v_user_permissions only filters inactive roles; a deleted role
         -- must not keep granting access either.
         JOIN tbl_user_level ul
           ON ul.user_level_id = a.user_level_id AND ul.is_deleted IS NOT TRUE
         WHERE a.users_id = $1 AND vp.module_code = ANY($2::text[])
         AND ${conditions}
         LIMIT 1`,
        [req.session.user.id, moduleCodes],
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
