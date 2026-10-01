import { redirect } from "react-router-dom";
import { fetchMyProfile } from "@/api/clientPortal.js";

// The client portal's auth cookie is httpOnly (see is-client-auth.js), so
// unlike the old localStorage token, there's no way to check client-side
// whether it's present — this now needs the same kind of round trip
// requireAuth (staff/admin) already does via /api/auth/me.
export async function requireClientAuth() {
  const profile = await fetchMyProfile().catch(() => null);
  if (!profile) {
    throw redirect("/login");
  }
  return profile;
}
