import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarX2, Clock, PackageX, PackageMinus } from "lucide-react";
import { fetchStockAlerts } from "@/api/http";

const SEEN_KEY = "stock-alerts-seen";

const KIND = {
  expired: { title: "Expired", icon: CalendarX2, tone: "text-red-600 bg-red-50 dark:text-[#ff8a8a] dark:bg-red-950/40" },
  expiring: { title: "Expiring soon", icon: Clock, tone: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40" },
  out: { title: "Out of stock", icon: PackageX, tone: "text-red-600 bg-red-50 dark:text-[#ff8a8a] dark:bg-red-950/40" },
  low: { title: "Low stock", icon: PackageMinus, tone: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40" },
};

function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function formatExpiry(value) {
  const d = new Date(String(value).replace(" ", "T"));
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function detail(a) {
  if (a.kind === "expired") return `Expired ${formatExpiry(a.product_expiry_date)} · ${a.product_quantity} left`;
  if (a.kind === "expiring") return `Expires ${formatExpiry(a.product_expiry_date)} · ${a.product_quantity} left`;
  if (a.kind === "out") return "No units left";
  return `${a.product_quantity} left`;
}

// Header bell for stock alerts: expired / expiring-soon batches and low /
// out-of-stock products. Refreshes every minute. The red count is alerts not
// seen yet in this browser; opening the panel marks them seen. An alert that
// goes away and comes back later counts as new again.
// `panelClass` positions the dropdown for where the bell sits.
export default function NotificationBell({ panelClass = "right-0 top-full mt-2", buttonClass = "" }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const wrapRef = useRef(null);

  const { data: alerts = [], isError } = useQuery({
    queryKey: ["stock-alerts"],
    queryFn: ({ signal }) => fetchStockAlerts({ signal }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const unread = alerts.filter((a) => !seen.has(a.key)).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && alerts.length) {
      // Keep only current keys so the stored list can't grow forever.
      const keys = alerts.map((a) => a.key);
      setSeen(new Set(keys));
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(keys));
      } catch {
        // storage blocked: the count just won't stay cleared after reload
      }
    }
  }

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = ["expired", "expiring", "out", "low"]
    .map((kind) => ({ kind, items: alerts.filter((a) => a.kind === kind) }))
    .filter((g) => g.items.length);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Stock alerts, ${unread} new` : "Stock alerts"}
        title="Stock alerts"
        className={`relative size-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white bg-transparent border-none cursor-pointer ${buttonClass}`}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-4.5 text-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Stock alerts"
          className={`absolute z-60 w-80 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white shadow-xl dark:bg-slate-900 dark:border-slate-800 ${panelClass}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Stock alerts</p>
            <span className="text-xs text-slate-500 dark:text-slate-400">{alerts.length} total</span>
          </div>

          <div className="max-h-[min(24rem,70dvh)] overflow-y-auto">
            {isError ? (
              <p className="px-4 py-6 text-sm text-center text-slate-500 dark:text-slate-400">
                Couldn't load alerts.
              </p>
            ) : groups.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-slate-500 dark:text-slate-400">
                All good — nothing low or expiring.
              </p>
            ) : (
              groups.map(({ kind, items }) => {
                const { title, icon: Icon, tone } = KIND[kind];
                return (
                  <section key={kind} className="py-1">
                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {title} ({items.length})
                    </p>
                    <ul>
                      {items.map((a) => (
                        <li key={a.key}>
                          <Link
                            to="/inventory"
                            onClick={() => setOpen(false)}
                            className="flex items-start gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <span className={`size-8 shrink-0 rounded-lg flex items-center justify-center ${tone}`}>
                              <Icon size={16} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {a.product_name}
                              </span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400">
                                {detail(a)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
            )}
          </div>

          <Link
            to="/inventory"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs font-bold text-indigo-700 dark:text-[#74d983] border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-b-xl"
          >
            Open Inventory ›
          </Link>
        </div>
      )}
    </div>
  );
}
