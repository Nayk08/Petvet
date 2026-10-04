// Admin = holds the Admin role among ANY of their active roles (refreshed
// on every request by isAuth), not just the primary one. The Admin role
// itself can't be renamed or deleted (see User_Level_Service), so the name
// is a stable key.
export const ADMIN_ROLE = "Admin";

export function isAdmin(user) {
  const roles = user?.roles ?? [user?.role];
  return roles.some((r) => r?.trim() === ADMIN_ROLE);
}
