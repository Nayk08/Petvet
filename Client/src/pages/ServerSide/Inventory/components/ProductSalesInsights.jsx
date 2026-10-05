import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChartCard from "@/components/ui/ChartCard.jsx";
import { fetchTopProducts, fetchProductMovers } from "@/api/http.js";

// Best sellers + fast/slow movers for one month (moved here from Analytics).

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
    month: "long",
    year: "numeric",
  });

  const btnClass =
    "w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => shiftMonth(-1)} className={btnClass} aria-label="Previous month">
        ‹
      </button>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-28 text-center">
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

// Horizontal ranked bar chart (top products).
function RankedBarChart({ data, valueKey, labelKey, colorVar, formatValue = (v) => v }) {
  const rowH = 32;
  const width = 640;
  const height = Math.max(1, data.length) * rowH + 12;
  const labelColW = 140;
  const innerW = width - labelColW - 70;
  const maxVal = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));

  return (
    <div className="analytics-viz">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Ranked bar chart"
      >
        {data.map((d, i) => {
          const val = Number(d[valueKey]) || 0;
          const barW = (val / maxVal) * innerW;
          const cy = i * rowH + rowH / 2;
          return (
            <g key={d[labelKey]}>
              <text
                x={labelColW - 8}
                y={cy + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {d[labelKey]?.length > 18
                  ? `${d[labelKey].slice(0, 17)}…`
                  : d[labelKey]}
              </text>
              <rect
                x={labelColW}
                y={cy - 9}
                width={Math.max(2, barW)}
                height={18}
                rx="4"
                fill={`var(${colorVar})`}
              >
                <title>
                  {d[labelKey]}: {formatValue(val)}
                </title>
              </rect>
              <text
                x={labelColW + Math.max(2, barW) + 6}
                y={cy + 4}
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {formatValue(val)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const formatCurrency = (v) => `₱${Number(v).toLocaleString()}`;
const formatCount = (v) => Number(v).toLocaleString();

export default function ProductSalesInsights() {
  const [month, setMonth] = useState(() => toMonthString(new Date()));
  const range = monthRange(month);

  const bestSellersQuery = useQuery({
    queryKey: ["InventoryBestSellers", month],
    queryFn: ({ signal }) => fetchTopProducts({ ...range, limit: 8, signal }),
  });

  const moversQuery = useQuery({
    queryKey: ["InventoryProductMovers", month],
    queryFn: ({ signal }) => fetchProductMovers({ month, signal }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Product Sales</h2>
          <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
            Best sellers and how fast each product moves, per month
          </p>
        </div>
        <MonthControl month={month} onChange={setMonth} />
      </div>

      <ChartCard
        title="Best Sellers"
        subtitle="Top 8 products by revenue"
        isPending={bestSellersQuery.isPending}
        isError={bestSellersQuery.isError}
        error={bestSellersQuery.error}
        isEmpty={(bestSellersQuery.data?.length ?? 0) === 0}
      >
        <RankedBarChart
          data={bestSellersQuery.data ?? []}
          valueKey="total_revenue"
          labelKey="product_name"
          colorVar="--slot-1"
          formatValue={formatCurrency}
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Fast Moving"
          subtitle="Top 5 by units sold"
          isPending={moversQuery.isPending}
          isError={moversQuery.isError}
          error={moversQuery.error}
          isEmpty={(moversQuery.data?.fastMoving?.length ?? 0) === 0}
        >
          <RankedBarChart
            data={moversQuery.data?.fastMoving ?? []}
            valueKey="total_quantity"
            labelKey="product_name"
            colorVar="--status-good"
            formatValue={formatCount}
          />
        </ChartCard>

        <ChartCard
          title="Slow Moving"
          subtitle="Bottom 5 by units sold (at least 1 sale)"
          isPending={moversQuery.isPending}
          isError={moversQuery.isError}
          error={moversQuery.error}
          isEmpty={(moversQuery.data?.slowMoving?.length ?? 0) === 0}
        >
          <RankedBarChart
            data={moversQuery.data?.slowMoving ?? []}
            valueKey="total_quantity"
            labelKey="product_name"
            colorVar="--status-critical"
            formatValue={formatCount}
          />
        </ChartCard>
      </div>
    </div>
  );
}
