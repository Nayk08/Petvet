import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const CLIENT_TOKEN_COOKIE = "client_token";

// httpOnly so no script on the page can read it, secure in production,
// sameSite matching. 7 days to match the JWT's own expiresIn.
export const CLIENT_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

// Gates the client-portal API. Deliberately separate from isAuth (which
// checks req.session for staff/admin) — the client portal has its own JWT,
// issued at Google sign-in (see ClientPortal_Controller.js:loginWithGoogle).
//
// FIXED: the JWT used to be returned in the login response body and kept in
// localStorage, readable by any script running on the page — a single XSS
// anywhere would mean full client-portal account takeover, unlike the
// staff session cookie (httpOnly). It's now issued as an httpOnly cookie
// instead, which JS can't read at all; the tradeoff is that a cookie IS
// attached automatically by the browser, so the mutating client-portal
// routes now need CSRF protection too (see ClientPortal_Route.js).
export default async function isClientAuth(req, res, next) {
  const token = req.cookies?.[CLIENT_TOKEN_COOKIE];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.CLIENT_JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }

  try {
    // The token lives 7 days — an archived client must lose access now,
    // not when it expires.
    const { rows } = await pool.query(
      `SELECT 1 FROM tbl_clients WHERE client_id = $1 AND is_deleted IS NOT TRUE`,
      [payload.client_id],
    );
    if (!rows.length) {
      res.clearCookie(CLIENT_TOKEN_COOKIE, CLIENT_TOKEN_COOKIE_OPTIONS);
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    req.clientUser = { client_id: payload.client_id, email: payload.email };
    next();
  } catch (err) {
    next(err);
  }
}
