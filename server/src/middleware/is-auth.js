import crypto from "crypto";
import pool from "../config/db.js";

// Fingerprint of the stored password hash. Kept in the session at login so
// a password reset ends every session that was opened with the old one.
export function passwordFingerprint(passwordHash) {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

// Re-validates the session against the DB instead of trusting what was
// cached at login, so that:
//   - a deleted user is logged out on their very next request (they used
//     to keep full access until the 24 h cookie expired),
//   - an admin password reset ends the user's existing sessions,
//   - role changes (and deleted/inactive roles) take effect immediately for
//     the sidebar and admin checks, not only after re-login.
export default async function isAuth(req, res, next) {
  // app.js mounts isAuth in front of every router on "/api", so one request
  // can pass through here many times — only hit the DB once.
  if (req.authChecked) return next();

  const sessionUser = req.session?.isLoggedIn && req.session.user;
  if (!sessionUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.user_password,
              pl.user_level AS primary_role,
              COALESCE(array_agg(ul.user_level_id ORDER BY (ul.user_level_id = u.user_level_id) DESC, ul.user_level_id)
                         FILTER (WHERE ul.user_level_id IS NOT NULL), '{}') AS level_ids,
              COALESCE(array_agg(TRIM(ul.user_level)) FILTER (WHERE ul.user_level_id IS NOT NULL), '{}') AS roles
       FROM tbl_users u
       LEFT JOIN tbl_user_level pl ON pl.user_level_id = u.user_level_id
       LEFT JOIN tbl_user_level_assignments a ON a.users_id = u.users_id AND a.is_active = true
       LEFT JOIN tbl_user_level ul ON ul.user_level_id = a.user_level_id
            AND ul.is_active = true AND ul.is_deleted IS NOT TRUE
       WHERE u.users_id = $1 AND u.is_deleted = false
       GROUP BY u.users_id, u.user_password, pl.user_level`,
      [sessionUser.id],
    );

    const fingerprint = rows[0] && passwordFingerprint(rows[0].user_password);
    const passwordChanged =
      sessionUser.pwd_fp && fingerprint && sessionUser.pwd_fp !== fingerprint;

    if (!rows[0] || passwordChanged) {
      return req.session.destroy(() =>
        res.status(401).json({ error: "Unauthorized" }),
      );
    }

    const fresh = {
      ...sessionUser,
      role: rows[0].primary_role,
      level_ids: rows[0].level_ids,
      roles: rows[0].roles,
      pwd_fp: fingerprint, // adopts sessions created before this check existed
    };
    // Only touch the session when something changed, so it isn't re-saved
    // to the session store on every request.
    if (JSON.stringify(fresh) !== JSON.stringify(sessionUser)) {
      req.session.user = fresh;
    }

    req.authChecked = true;
    next();
  } catch (err) {
    next(err);
  }
}
