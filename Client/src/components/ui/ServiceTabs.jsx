import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser, fetchNavbar } from "@/api/http.js";

const SERVICES = [
  ["C_APPOINTMENT", "Consultation", "/consultation-appointment"],
  ["G_APPOINTMENT", "Grooming", "/grooming-appointment"],
  ["O_APPOINTMENT", "Operation", "/operation-appointment"],
];

// Segmented switch between the service queues the user's role can open.
// Same queries (and cache) as the sidebar, so it never refetches.
export default function ServiceTabs() {
  const { data: me } = useQuery({
    queryKey: ["currentUser"],
    queryFn: ({ signal }) => fetchCurrentUser({ signal }),
    staleTime: 1000 * 60 * 5,
  });
  const user = me?.user;
  const { data } = useQuery({
    queryKey: ["navData", user?.id, user?.role],
    queryFn: ({ signal }) => fetchNavbar({ signal }),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(user?.id && user?.role),
  });

  const allowed = new Set((data?.modules || []).map((m) => m.module_code));
  const tabs = SERVICES.filter(([code]) => allowed.has(code));
  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="Service queues"
      className="grid gap-1 p-1 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 md:max-w-md"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map(([code, label, to]) => (
        <NavLink
          key={code}
          to={to}
          className={({ isActive }) =>
            `min-h-10 rounded-[10px] flex items-center justify-center text-[13px] font-bold transition-colors ${
              isActive
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
