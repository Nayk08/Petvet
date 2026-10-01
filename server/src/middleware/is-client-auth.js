import jwt from "jsonwebtoken";

export const CLIENT_TOKEN_COOKIE = "client_token";

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
export default function isClientAuth(req, res, next) {
  const token = req.cookies?.[CLIENT_TOKEN_COOKIE];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.CLIENT_JWT_SECRET);
    req.clientUser = { client_id: payload.client_id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}
