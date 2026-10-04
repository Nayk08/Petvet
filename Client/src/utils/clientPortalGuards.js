import { redirect } from "react-router-dom";
import { fetchMyProfile } from "@/api/clientPortal.js";
import { queryClient } from "@/api/http.js";

// The client portal's auth cookie is httpOnly (see is-client-auth.js), so
// unlike the old localStorage token, there's no way to check client-side
// whether it's present — this now needs the same kind of round trip
// requireAuth (staff/admin) already does via /api/auth/me.
export async function requireClientAuth() {
  try {
    // Cached (same key/staleTime PortalLayout's profile query uses) like the
    // staff requireAuth — this loader re-runs on EVERY portal navigation, so
    // an uncached round trip each time multiplied every page change into a
    // /me request (and any navigation loop into a flood of them).
    return await queryClient.ensureQueryData({
      queryKey: ["clientPortal", "me"],
      queryFn: ({ signal }) => fetchMyProfile({ signal }),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    // Only a genuine 401 (cookie missing/expired/invalid) means "not
    // logged in" — a rate limit (429), a timeout, or a transient 500 is a
    // server hiccup, not a logout, and previously got treated identically
    // (any failure -> redirect to /login), which is exactly what made a
    // brief 429 look like getting signed out mid-session. Anything else
    // propagates as a normal route error instead of bouncing the user.
    if (error?.code === 401) {
      throw redirect("/login");
    }
    throw error;
  }
}
