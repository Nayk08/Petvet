import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, XCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import {
  fetchRevenueTrend,
  fetchAppointmentsBreakdown,
  fetchTopProducts,
  fetchClientGrowth,
  fetchProductMovers,
  fetchCriticalStock,
  fetchPeakTimes,
  pullExpiredProducts,
  queryClient,
} from "@/api/http.js";

// ── Date range ──────────────────────────────────────────────────────────

function toDateString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgoRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start_date: toDateString(start), end_date: toDateString(end) };
}

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function DateRangeControl({ range, onChange }) {
  const [activePreset, setActivePreset] = useState(30);
  const [showCustom, setShowCustom] = useState(false);

  function applyPreset(days) {
    setActivePreset(days);
    setShowCustom(false);
    onChange(daysAgoRange(days));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.days}
          type="button"
          onClick={() => applyPreset(p.days)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            !showCustom && activePreset === p.days
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setShowCustom((s) => !s)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
          showCustom
            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
        }`}
      >
        Custom
      </button>
      {showCustom && (
        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-200 dark:border-slate-800">
          <input
            type="date"
            value={range.start_date}
            max={range.end_date}
            onChange={(e) => onChange({ ...range, start_date: e.target.value })}
            className="text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 [color-scheme:light] dark:[color-scheme:dark]"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={range.end_date}
            min={range.start_date}
            max={toDateString(new Date())}
            onChange={(e) => onChange({ ...range, end_date: e.target.value })}
            className="text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
      )}
    </div>
  );
}

// ── Month control (Product Movers section) ─────────────────────────────

function currentMonthString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function MonthControl({ month, onChange }) {
  function shiftMonth(delta) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const btnClass =
    "w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        className={btnClass}
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-28 text-center">
        {label}
      </span>
      <button
        type="button"
        onClick={() => shiftMonth(1)}
        disabled={month >= currentMonthString()}
        className={btnClass}
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}

// ── Chart primitives (inline SVG, no library) ──────────────────────────

const CHART_H = 220;
const CHART_PAD = { top: 12, right: 12, bottom: 24, left: 36 };

function scaleLinear(domainMax, rangeMax) {
  const max = domainMax > 0 ? domainMax : 1;
  return (v) => (v / max) * rangeMax;
}

function niceTicks(max, count = 4) {
  if (max <= 0) return [0];
  const step = Math.ceil(max / count / 10 ** Math.floor(Math.log10(max / count))) *
    10 ** Math.floor(Math.log10(max / count));
  const ticks = [];
  for (let v = 0; v <= max + step; v += step) ticks.push(v);
  return ticks;
}

function ChartCard({ title, subtitle, children, isPending, isError, error, isEmpty }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
          {subtitle}
        </p>
      )}
      <div className="mt-4">
        {isPending ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Loading...
          </div>
        ) : isError ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-rose-500 dark:text-rose-400">
            {error?.message ?? "Failed to load"}
          </div>
        ) : isEmpty ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-slate-400 italic dark:text-slate-500">
            No data for this range.
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: `var(${item.colorVar})` }}
          />
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Two-series (or one) line chart over a date-indexed series.
function LineChart({ data, series, formatValue = (v) => v }) {
  const width = 640;
  const innerW = width - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)),
  );
  const ticks = niceTicks(maxVal);
  const yMax = ticks[ticks.length - 1];
  const y = scaleLinear(yMax, innerH);
  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;

  const linePath = (key) =>
    data
      .map((d, i) => {
        const px = CHART_PAD.left + i * xStep;
        const py = CHART_PAD.top + innerH - y(Number(d[key]) || 0);
        return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");

  // Show at most ~6 x-axis labels regardless of range length.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="analytics-viz">
      {series.length > 1 && (
        <Legend
          items={series.map((s) => ({ label: s.label, colorVar: s.colorVar }))}
        />
      )}
      <svg
        viewBox={`0 0 ${width} ${CHART_H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Line chart"
      >
        {ticks.map((t) => {
          const py = CHART_PAD.top + innerH - y(t);
          return (
            <g key={t}>
              <line
                x1={CHART_PAD.left}
                x2={width - CHART_PAD.right}
                y1={py}
                y2={py}
                stroke="var(--gridline)"
                strokeWidth="1"
              />
              <text
                x={CHART_PAD.left - 6}
                y={py + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--muted)"
              >
                {formatValue(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== data.length - 1) return null;
          const px = CHART_PAD.left + i * xStep;
          return (
            <text
              key={d.day}
              x={px}
              y={CHART_H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted)"
            >
              {d.day?.slice(5)}
            </text>
          );
        })}

        {series.map((s) => (
          <path
            key={s.key}
            d={linePath(s.key)}
            fill="none"
            stroke={`var(${s.colorVar})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {series.map((s) =>
          data.map((d, i) => {
            const px = CHART_PAD.left + i * xStep;
            const py = CHART_PAD.top + innerH - y(Number(d[s.key]) || 0);
            return (
              <circle
                key={`${s.key}-${d.day}`}
                cx={px}
                cy={py}
                r="3"
                fill={`var(${s.colorVar})`}
              >
                <title>
                  {d.day} — {s.label}: {formatValue(d[s.key])}
                </title>
              </circle>
            );
          }),
        )}
      </svg>
    </div>
  );
}

// Vertical bar chart for a small set of categories.
function BarChart({ data, valueKey, labelKey, colorVar, formatValue = (v) => v }) {
  const width = 320;
  const innerW = width - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  const maxVal = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  const ticks = niceTicks(maxVal);
  const yMax = ticks[ticks.length - 1];
  const y = scaleLinear(yMax, innerH);
  const bandW = innerW / data.length;
  const barW = Math.min(48, bandW * 0.55);

  return (
    <div className="analytics-viz">
      <svg
        viewBox={`0 0 ${width} ${CHART_H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Bar chart"
      >
        {ticks.map((t) => {
          const py = CHART_PAD.top + innerH - y(t);
          return (
            <g key={t}>
              <line
                x1={CHART_PAD.left}
                x2={width - CHART_PAD.right}
                y1={py}
                y2={py}
                stroke="var(--gridline)"
                strokeWidth="1"
              />
              <text
                x={CHART_PAD.left - 6}
                y={py + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--muted)"
              >
                {formatValue(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const val = Number(d[valueKey]) || 0;
          const barH = y(val);
          const cx = CHART_PAD.left + bandW * i + bandW / 2;
          const barColor =
            typeof colorVar === "function" ? colorVar(d) : colorVar;
          return (
            <g key={d[labelKey]}>
              <rect
                x={cx - barW / 2}
                y={CHART_PAD.top + innerH - barH}
                width={barW}
                height={barH}
                rx="4"
                fill={`var(${barColor})`}
              >
                <title>
                  {d[labelKey]}: {formatValue(val)}
                </title>
              </rect>
              <text
                x={cx}
                y={CHART_H - 6}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted)"
              >
                {d[labelKey]}
              </text>
            </g>
          );
        })}
      </svg>
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
const formatHourLabel = (hour) => {
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
};
const formatDayShort = (dayName) => dayName.slice(0, 3);

const STATUS_COLOR_VAR = {
  Pending: "--status-warning",
  "In Queue": "--slot-1",
  Completed: "--status-good",
  Cancelled: "--status-critical",
};

function StockStatusBadge({ status }) {
  const styles =
    status === "Out of Stock"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
      : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800";
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${styles}`}
    >
      {status}
    </span>
  );
}

function ExpiryBadge({ isExpired }) {
  const styles = isExpired
    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${styles}`}
    >
      {isExpired ? "Expired" : "Expiring Soon"}
    </span>
  );
}

function formatExpiryDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Component() {
  const [range, setRange] = useState(() => daysAgoRange(30));
  const [month, setMonth] = useState(() => currentMonthString());

  const revenueQuery = useQuery({
    queryKey: ["AnalyticsRevenueTrend", range.start_date, range.end_date],
    queryFn: ({ signal }) => fetchRevenueTrend({ ...range, signal }),
  });

  const appointmentsQuery = useQuery({
    queryKey: ["AnalyticsAppointments", range.start_date, range.end_date],
    queryFn: ({ signal }) => fetchAppointmentsBreakdown({ ...range, signal }),
  });

  const peakTimesQuery = useQuery({
    queryKey: ["AnalyticsPeakTimes", range.start_date, range.end_date],
    queryFn: ({ signal }) => fetchPeakTimes({ ...range, signal }),
  });

  const topProductsQuery = useQuery({
    queryKey: ["AnalyticsTopProducts", range.start_date, range.end_date],
    queryFn: ({ signal }) => fetchTopProducts({ ...range, limit: 8, signal }),
  });

  const clientGrowthQuery = useQuery({
    queryKey: ["AnalyticsClientGrowth", range.start_date, range.end_date],
    queryFn: ({ signal }) => fetchClientGrowth({ ...range, signal }),
  });

  const productMoversQuery = useQuery({
    queryKey: ["AnalyticsProductMovers", month],
    queryFn: ({ signal }) => fetchProductMovers({ month, signal }),
  });

  const criticalStockQuery = useQuery({
    queryKey: ["AnalyticsCriticalStock"],
    queryFn: ({ signal }) => fetchCriticalStock({ signal }),
  });

  const expiredCount =
    criticalStockQuery.data?.filter((p) => p.is_expired).length ?? 0;

  const rqClient = useQueryClient();
  const [showPullExpired, setShowPullExpired] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  async function handlePullExpired() {
    setIsPulling(true);
    try {
      const { removed } = await pullExpiredProducts();
      await rqClient.invalidateQueries({ queryKey: ["AnalyticsCriticalStock"] });
      await rqClient.invalidateQueries({ queryKey: ["inventory"] });
      await rqClient.invalidateQueries({ queryKey: ["inventory-batches"] });
      setShowPullExpired(false);
      toast.success("Expired products removed", {
        className:
          "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
        description: `${removed.length} expired product${removed.length === 1 ? "" : "s"} removed from inventory.`,
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 2500,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      });
    } catch (err) {
      toast.error("Failed to remove expired products", {
        className:
          "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
        description: err.message || "Something went wrong.",
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 2500,
        icon: <XCircle className="h-5 w-5 text-destructive" />,
      });
    } finally {
      setIsPulling(false);
    }
  }

  return (
    <div className="w-full space-y-6 py-8">
      <style>{`
        .analytics-viz {
          --slot-1: #2a78d6;
          --slot-2: #eb6834;
          --slot-3: #1baf7a;
          --status-good: #0ca30c;
          --status-warning: #fab219;
          --status-serious: #ec835a;
          --status-critical: #d03b3b;
          --gridline: #e1e0d9;
          --muted: #898781;
          --text-secondary: #52514e;
        }
        .dark .analytics-viz {
          --slot-1: #3987e5;
          --slot-2: #d95926;
          --slot-3: #199e70;
          --status-good: #0ca30c;
          --status-warning: #fab219;
          --status-serious: #ec835a;
          --status-critical: #d03b3b;
          --gridline: #2c2c2a;
          --muted: #898781;
          --text-secondary: #c3c2b7;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-wide dark:text-white">
            Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Revenue, appointments, sales, and client trends.
          </p>
        </div>
        <DateRangeControl range={range} onChange={setRange} />
      </div>

      {/* Revenue trend */}
      <ChartCard
        title="Revenue Trend"
        subtitle="Sales (cart checkouts) vs Services (appointments)"
        isPending={revenueQuery.isPending}
        isError={revenueQuery.isError}
        error={revenueQuery.error}
        isEmpty={(revenueQuery.data?.length ?? 0) === 0}
      >
        <LineChart
          data={revenueQuery.data ?? []}
          series={[
            { key: "sales", label: "Sales", colorVar: "--slot-1" },
            { key: "services", label: "Services", colorVar: "--slot-2" },
          ]}
          formatValue={formatCurrency}
        />
      </ChartCard>

      {/* Appointments breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Appointments by Service"
          isPending={appointmentsQuery.isPending}
          isError={appointmentsQuery.isError}
          error={appointmentsQuery.error}
          isEmpty={(appointmentsQuery.data?.byService?.length ?? 0) === 0}
        >
          <BarChart
            data={appointmentsQuery.data?.byService ?? []}
            valueKey="count"
            labelKey="service_name"
            colorVar="--slot-3"
            formatValue={formatCount}
          />
        </ChartCard>

        <ChartCard
          title="Appointments by Status"
          isPending={appointmentsQuery.isPending}
          isError={appointmentsQuery.isError}
          error={appointmentsQuery.error}
          isEmpty={(appointmentsQuery.data?.byStatus?.length ?? 0) === 0}
        >
          <BarChart
            data={appointmentsQuery.data?.byStatus ?? []}
            valueKey="count"
            labelKey="appointment_status_name"
            colorVar={(d) =>
              STATUS_COLOR_VAR[d.appointment_status_name] ?? "--slot-1"
            }
            formatValue={formatCount}
          />
        </ChartCard>
      </div>

      {/* Peak hours + Peak days — booking demand, not just completed visits,
          same scope as Appointments by Service/Status above (every
          non-deleted appointment in range, any status). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Peak Hours"
          subtitle={
            peakTimesQuery.data?.peakHour
              ? `Busiest: ${formatHourLabel(peakTimesQuery.data.peakHour.hour)} (${formatCount(peakTimesQuery.data.peakHour.count)} bookings)`
              : "Bookings by hour of day"
          }
          isPending={peakTimesQuery.isPending}
          isError={peakTimesQuery.isError}
          error={peakTimesQuery.error}
          isEmpty={(peakTimesQuery.data?.byHour?.length ?? 0) === 0}
        >
          <BarChart
            data={(peakTimesQuery.data?.byHour ?? []).map((d) => ({
              ...d,
              label: formatHourLabel(d.hour),
            }))}
            valueKey="count"
            labelKey="label"
            colorVar={(d) =>
              peakTimesQuery.data?.peakHour?.hour === d.hour
                ? "--status-good"
                : "--slot-1"
            }
            formatValue={formatCount}
          />
        </ChartCard>

        <ChartCard
          title="Peak Days"
          subtitle={
            peakTimesQuery.data?.peakDay
              ? `Busiest: ${peakTimesQuery.data.peakDay.day_name} (${formatCount(peakTimesQuery.data.peakDay.count)} bookings)`
              : "Bookings by day of week"
          }
          isPending={peakTimesQuery.isPending}
          isError={peakTimesQuery.isError}
          error={peakTimesQuery.error}
          isEmpty={(peakTimesQuery.data?.byDay?.length ?? 0) === 0}
        >
          <BarChart
            data={(peakTimesQuery.data?.byDay ?? []).map((d) => ({
              ...d,
              label: formatDayShort(d.day_name),
            }))}
            valueKey="count"
            labelKey="label"
            colorVar={(d) =>
              peakTimesQuery.data?.peakDay?.day_of_week === d.day_of_week
                ? "--status-good"
                : "--slot-2"
            }
            formatValue={formatCount}
          />
        </ChartCard>
      </div>

      {/* Top products + Client growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Top-Selling Products"
          subtitle="Ranked by revenue"
          isPending={topProductsQuery.isPending}
          isError={topProductsQuery.isError}
          error={topProductsQuery.error}
          isEmpty={(topProductsQuery.data?.length ?? 0) === 0}
        >
          <RankedBarChart
            data={topProductsQuery.data ?? []}
            valueKey="total_revenue"
            labelKey="product_name"
            colorVar="--slot-1"
            formatValue={formatCurrency}
          />
        </ChartCard>

        <ChartCard
          title="Client Growth"
          subtitle="New clients registered"
          isPending={clientGrowthQuery.isPending}
          isError={clientGrowthQuery.isError}
          error={clientGrowthQuery.error}
          isEmpty={(clientGrowthQuery.data?.length ?? 0) === 0}
        >
          <LineChart
            data={clientGrowthQuery.data ?? []}
            series={[
              { key: "new_clients", label: "New clients", colorVar: "--slot-1" },
            ]}
            formatValue={formatCount}
          />
        </ChartCard>
      </div>

      {/* Product movers */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Product Movers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
              Units sold per product this month, ranked
            </p>
          </div>
          <MonthControl month={month} onChange={setMonth} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Fast Moving"
            subtitle="Top 5 by units sold"
            isPending={productMoversQuery.isPending}
            isError={productMoversQuery.isError}
            error={productMoversQuery.error}
            isEmpty={(productMoversQuery.data?.fastMoving?.length ?? 0) === 0}
          >
            <RankedBarChart
              data={productMoversQuery.data?.fastMoving ?? []}
              valueKey="total_quantity"
              labelKey="product_name"
              colorVar="--status-good"
              formatValue={formatCount}
            />
          </ChartCard>

          <ChartCard
            title="Slow Moving"
            subtitle="Bottom 5 by units sold (at least 1 sale)"
            isPending={productMoversQuery.isPending}
            isError={productMoversQuery.isError}
            error={productMoversQuery.error}
            isEmpty={(productMoversQuery.data?.slowMoving?.length ?? 0) === 0}
          >
            <RankedBarChart
              data={productMoversQuery.data?.slowMoving ?? []}
              valueKey="total_quantity"
              labelKey="product_name"
              colorVar="--status-critical"
              formatValue={formatCount}
            />
          </ChartCard>
        </div>
      </div>

      {/* Critical stock */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Critical Stock
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
              Low/out-of-stock products, plus anything expired or expiring
              within 5 months
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={expiredCount === 0}
              onClick={() => setShowPullExpired(true)}
              className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 disabled:text-slate-400 disabled:border-slate-200 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950/40 dark:disabled:text-slate-600 dark:disabled:border-slate-800"
            >
              <Trash2 size={14} />
              <span>Remove Expired{expiredCount > 0 ? ` (${expiredCount})` : ""}</span>
            </Button>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 whitespace-nowrap"
            >
              View Inventory →
            </Link>
          </div>
        </div>

        <div className="mt-4">
          {criticalStockQuery.isPending ? (
            <div className="h-24 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              Loading...
            </div>
          ) : criticalStockQuery.isError ? (
            <div className="h-24 flex items-center justify-center text-sm text-rose-500 dark:text-rose-400">
              {criticalStockQuery.error?.message ?? "Failed to load"}
            </div>
          ) : (criticalStockQuery.data?.length ?? 0) === 0 ? (
            <div className="h-24 flex items-center justify-center text-sm text-slate-400 italic dark:text-slate-500">
              No products are low/out of stock or nearing expiry.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-lg dark:border-slate-800 scrollbar-thin [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#334155_transparent]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950">
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold text-right">Qty</th>
                    <th className="px-3 py-2 font-semibold text-right">Expiry</th>
                    <th className="px-3 py-2 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {criticalStockQuery.data.map((p) => (
                    <tr key={p.product_id}>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                        {p.product_name}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">
                        {p.product_quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                        {formatExpiryDate(p.product_expiry_date)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {(p.status_name === "Low Stock" ||
                            p.status_name === "Out of Stock") && (
                            <StockStatusBadge status={p.status_name} />
                          )}
                          {(p.is_expired || p.expiring_soon) && (
                            <ExpiryBadge isExpired={p.is_expired} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={showPullExpired}
        onOpenChange={(isOpen) => !isOpen && !isPulling && setShowPullExpired(false)}
      >
        <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-sm shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              Remove expired products?
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              This removes {expiredCount} expired product
              {expiredCount === 1 ? "" : "s"} from inventory — items that are
              only low/out of stock or expiring soon are left alone. This
              can't be undone from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            {!isPulling && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPullExpired(false)}
                className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              disabled={isPulling}
              onClick={handlePullExpired}
            >
              {isPulling ? "Removing..." : "Yes, remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export async function loader() {
  const range = daysAgoRange(30);
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["AnalyticsRevenueTrend", range.start_date, range.end_date],
      queryFn: ({ signal }) => fetchRevenueTrend({ ...range, signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["AnalyticsAppointments", range.start_date, range.end_date],
      queryFn: ({ signal }) => fetchAppointmentsBreakdown({ ...range, signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["AnalyticsTopProducts", range.start_date, range.end_date],
      queryFn: ({ signal }) => fetchTopProducts({ ...range, limit: 8, signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["AnalyticsClientGrowth", range.start_date, range.end_date],
      queryFn: ({ signal }) => fetchClientGrowth({ ...range, signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["AnalyticsProductMovers", currentMonthString()],
      queryFn: ({ signal }) =>
        fetchProductMovers({ month: currentMonthString(), signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["AnalyticsCriticalStock"],
      queryFn: ({ signal }) => fetchCriticalStock({ signal }),
    }),
  ]);
  return null;
}
