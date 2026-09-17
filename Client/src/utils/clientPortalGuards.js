import { redirect } from "react-router-dom";
import { getClientToken } from "@/api/clientPortal.js";

// Unlike requireAuth (staff/admin, session-based — needs a round trip to
// /api/auth/me to know if you're logged in), the client portal's JWT
// either exists in localStorage or it doesn't; no server round trip is
// needed just to gate rendering. An expired/invalid token is caught later
// by the first API call's 401 handling (clientPortal.js), which redirects
// the same way.
export function requireClientAuth() {
  if (!getClientToken()) {
    throw redirect("/login");
  }
  return null;
}
