// src/utils/routeGuards.js
import { redirect } from "react-router-dom";
import {
  fetchCurrentUser,
  fetchNavbar,
  queryClient,
  loginUrlReturningHere,
} from "../api/http";
import { resolveLandingPath } from "./resolveLandingPath.js";

// Require the user to be logged in
export async function requireAuth() {
  const { user } = await queryClient.ensureQueryData({
    queryKey: ["currentUser"],
    queryFn: ({ signal }) => fetchCurrentUser({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  if (!user) {
    throw redirect(loginUrlReturningHere());
  }
  return user;
}

// Require the user to be logged in AND have one of the allowed roles
export function requireRole(allowedRoles) {
  return async () => {
    const user = await requireAuth();

    if (!allowedRoles.includes(user.role)) {
      throw redirect("/unauthorized");
    }
    return user;
  };
}

// Require the user to be logged in AND have the given action flag (default
// can_view) true for a given module_code, per the Permission Matrix.
export function requirePermission(moduleCode, action = "can_view") {
  return async () => {
    const user = await requireAuth();

    const { modules } = await queryClient.ensureQueryData({
      queryKey: ["navData", user.id, user.role],
      queryFn: ({ signal }) => fetchNavbar({ signal }),
      staleTime: 1000 * 60 * 5,
    });

    const allowed = modules?.some(
      (m) => m.module_code === moduleCode && m[action] === true,
    );

    if (!allowed) {
      throw redirect("/unauthorized");
    }

    return user;
  };
}

export async function loader() {
  const { user } = await queryClient.ensureQueryData({
    queryKey: ["currentUser"],
    queryFn: ({ signal }) => fetchCurrentUser({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  if (user) {
    const { modules } = await queryClient.ensureQueryData({
      queryKey: ["navData", user.id, user.role],
      queryFn: ({ signal }) => fetchNavbar({ signal }),
      staleTime: 1000 * 60 * 5,
    });
    throw redirect(resolveLandingPath(modules));
  }

  return null;
}
