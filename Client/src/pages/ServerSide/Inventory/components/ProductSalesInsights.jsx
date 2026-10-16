import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChartCard from "@/components/ui/ChartCard.jsx";
import BarList from "@/components/ui/BarList.jsx";
import Segmented from "@/components/ui/Segmented.jsx";
import { fetchTopProducts, fetchProductMovers } from "@/api/http.js";

// Best sellers + fast/slow movers for one month (Analytics and Inventory's
// Product Sales tab): one card, a tab per list.

const pad2 = (n) => String(n).padStart(2, "0");
const toMonthString = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

// "2026-10" → { start_date: "2026-10-01", end_date: "2026-10-31" }
function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start_date: `${month}-01`, end_date: `${month}-${pad2(lastDay)}` };
}

function MonthControl({ month, onChange }) {
  function shiftMonth(delta) {
    const [y, m] = month.split("-").map(Number);
    onChange(toMonthString(new Date(y, m - 1 + delta, 1)));
  }

  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const btnClass =
    "size-9 flex items-center justify-center rounded-lg text-lg leading-none text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent bg-transparent border-none cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";

  return (
    <div className="flex items-center">
      <button type="button" onClick={() => shiftMonth(-1)} className={btnClass} aria-label="Previous month">
        ‹
      </button>
      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 w-16 text-center whitespace-nowrap">
        {label}
      </span>
      <button
        type="button"
        onClick={() => shiftMonth(1)}
        disabled={month >= toMonthString(new Date())}
        className={btnClass}
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}

const formatCurrency = (v) => `₱${Number(v).toLocaleString()}`;
const formatUnits = (v) => `${Number(v).toLocaleString()} ${Number(v) === 1 ? "unit" : "units"}`;

const VIEWS = [
  { value: "best", label: "Best sellers" },
  { value: "fast", label: "Fast moving" },
  { value: "slow", label: "Slow moving" },
];

export default function ProductSalesInsights() {
  const [month, setMonth] = useState(() => toMonthString(new Date()));
  const [view, setView] = useState("best");
  const range = monthRange(month);

  const bestSellersQuery = useQuery({
    queryKey: ["InventoryBestSellers", month],
    queryFn: ({ signal }) => fetchTopProducts({ ...range, limit: 8, signal }),
  });

  const moversQuery = useQuery({
    queryKey: ["InventoryProductMovers", month],
    queryFn: ({ signal }) => fetchProductMovers({ month, signal }),
  });

  const query = view === "best" ? bestSellersQuery : moversQuery;
  const rows =
    view === "best"
      ? bestSellersQuery.data ?? []
      : (view === "fast" ? moversQuery.data?.fastMoving : moversQuery.data?.slowMoving) ?? [];
  const note = {
    best: "Top 8 products by revenue",
    fast: "Top 5 by units sold",
    slow: "Bottom 5 by units sold (at least 1 sale)",
  }[view];

  return (
    <ChartCard
      title="Product sales"
      subtitle="Best sellers and how fast each product moves, per month"
      action={<MonthControl month={month} onChange={setMonth} />}
      isPending={false}
    >
      <div className="flex flex-col gap-3">
        <Segmented label="Product sales view" options={VIEWS} value={view} onChange={setView} />
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{note}</p>
        {query.isPending ? (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        ) : query.isError ? (
          <p className="py-8 text-center text-sm text-rose-500 dark:text-rose-400">
            {query.error?.message ?? "Failed to load"}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400 italic dark:text-slate-500">No sales this month.</p>
        ) : (
          <BarList
            stacked
            barClass={
              view === "slow"
                ? "bg-red-500 dark:bg-[#ff8a8a]"
                : view === "fast"
                  ? "bg-teal-600 dark:bg-[#6fe0d0]"
                  : "bg-indigo-600 dark:bg-[#5fd36e]"
            }
            items={rows.map((r) =>
              view === "best"
                ? { label: r.product_name, value: Number(r.total_revenue), display: formatCurrency(r.total_revenue) }
                : { label: r.product_name, value: Number(r.total_quantity), display: formatUnits(r.total_quantity) },
            )}
          />
        )}
      </div>
    </ChartCard>
  );
}
