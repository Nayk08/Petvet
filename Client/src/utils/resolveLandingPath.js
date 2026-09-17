// utils/resolveLandingPath.js

// /nav only ever returns modules the current user can_view (server-side
// filtered — see Common_Model.js:getNavbarData's `HAVING bool_or(can_view)`),
// each with a `route` and `sort_order` — the same data the navbar itself
// renders from. Land on Dashboard if it's in that list; otherwise send the
// user to whichever accessible module sorts first, rather than bouncing
// them to a Dashboard they have no access to.
export function resolveLandingPath(modules) {
  const navigable = (modules ?? [])
    .filter((m) => m.route)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (navigable.length === 0) return "/dashboard";

  const dashboardModule = navigable.find((m) => m.module_code === "DASHBOARD");
  const route = dashboardModule?.route ?? navigable[0].route;

  // tbl_user_module.route is stored relative (e.g. "dashboard", matching
  // App.jsx's child route `path:` values), not absolute. redirect() resolves
  // a relative target against whatever route the loader runs from — e.g.
  // from /login's own loader, "dashboard" resolves to "/login/dashboard" —
  // so force it absolute here regardless of caller.
  return route.startsWith("/") ? route : `/${route}`;
}
