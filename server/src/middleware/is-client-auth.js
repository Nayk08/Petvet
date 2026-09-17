import jwt from "jsonwebtoken";

// Gates the client-portal API. Deliberately separate from isAuth (which
// checks req.session for staff/admin) — the client portal uses a JWT
// bearer token instead of a cookie session, so there is no session to
// check here at all. A bearer token isn't attached to requests
// automatically by the browser the way a cookie is, so these routes don't
// need CSRF protection either.
export default function isClientAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
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
