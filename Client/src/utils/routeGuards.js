// src/utils/routeGuards.js
import { redirect } from "react-router-dom";
import { getCurrentUser } from "../api/auth";
import { fetchNavbar } from "../api/http";

// Require the user to be logged in
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw redirect("/login?mode=login");
  }
  return user;
}

// Require the user to be logged in AND have one of the allowed roles
// NOTE: kept for reference / non-matrix-governed routes. Prefer
// requirePermission below for anything the Permission Matrix should control.
export function requireRole(allowedRoles) {
  return async () => {
    const user = await getCurrentUser();

    if (!user) {
      throw redirect("/login?mode=login");
    }
    if (!allowedRoles.includes(user.role)) {
      throw redirect("/unauthorized");
    }
    return user;
  };
}

// Require the user to be logged in AND have the given action flag (default
// can_view) true for a given module_code, per the Permission Matrix
// (tbl_module_access / v_user_permissions). This is what makes toggling a
// switch in the Permission Matrix UI actually affect who can reach a route —
// requireRole's hardcoded list can't do that.
//
// action can be "can_view" | "can_add" | "can_edit" | "can_delete" (whatever
// action flags fetchNavbar returns per module).
export function requirePermission(moduleCode, action = "can_view") {
  return async () => {
    const user = await getCurrentUser();

    if (!user) {
      throw redirect("/login?mode=login");
    }

    const { modules } = await fetchNavbar({});

    // Defensive check here even though v_user_permissions/getNavbarData
    // should already be filtering server-side — belt and suspenders
    // until that's confirmed in place.
    const allowed = modules?.some(
      (m) => m.module_code === moduleCode && m[action] === true,
    );

    if (!allowed) {
      throw redirect("/unauthorized");
    }

    return user;
  };
}
