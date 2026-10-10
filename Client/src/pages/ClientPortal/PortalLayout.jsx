import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Calendar, Cat, CreditCard, Sun, Moon } from "lucide-react";
import { fetchMyProfile, logoutClient } from "@/api/clientPortal.js";
import { queryClient } from "@/api/http.js";
import petvetLogo from "@/assets/petvet_icon.svg";

const NAV_ITEMS = [
  { to: "/portal/appointments", label: "My Appointments", shortLabel: "Appointments", icon: Calendar },
  { to: "/portal/pets", label: "My Pets", shortLabel: "Pets", icon: Cat },
  { to: "/portal/payments", label: "Payment History", shortLabel: "Payments", icon: CreditCard },
];

// Phone bottom tab bar: icon over a short label, thumb-reachable.
const bottomLinkClass = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
    isActive
      ? "text-indigo-600 dark:text-indigo-300"
      : "text-slate-500 dark:text-slate-400"
  }`;

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
    isActive
      ? "bg-indigo-50 text-indigo-600 font-medium dark:bg-indigo-500/15 dark:text-indigo-300"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
  }`;

export function Component() {
  const navigate = useNavigate();

  // Same localStorage key/logic as the staff Navbar's toggle (Layout.jsx),
  // so switching theme on one side is remembered consistently if someone
  // ever has both open, but the portal gets its own visible control
  // instead of silently inheriting whatever <html> already had.
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const { data: profile } = useQuery({
    queryKey: ["clientPortal", "me"],
    queryFn: ({ signal }) => fetchMyProfile({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  async function handleLogout() {
    try {
      await logoutClient();
    } catch {
      // Cookie clearing is best-effort from the UI's perspective — even if
      // this request fails, sending the client back to /login is still the
      // right outcome (and an expired/invalid cookie is no worse than one
      // that failed to clear).
    }
    queryClient.removeQueries({ queryKey: ["clientPortal"] });
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 dark:bg-slate-950/85 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src={petvetLogo} alt="PetVet logo" className="h-7 w-7" />
            <span className="font-extrabold">
              <span className="text-red-600 dark:text-red-500">Pet</span>
              <span className="text-emerald-600 dark:text-emerald-500">Vet</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:inline">
              {profile?.name ?? "..."}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg bg-transparent border-none cursor-pointer transition-colors dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom padding on phones keeps content clear of the tab bar. */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>

      {/* Phones: fixed bottom tab bar instead of cramped top tabs. */}
      <nav
        aria-label="Portal sections"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-950/95"
      >
        {NAV_ITEMS.map(({ to, shortLabel, icon: Icon }) => (
          <NavLink key={to} to={to} className={bottomLinkClass}>
            <Icon size={20} />
            {shortLabel}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
