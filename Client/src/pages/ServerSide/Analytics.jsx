import { useState } from "react";
import useBoxWidth from "@/hooks/useBoxWidth.jsx";
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
import ChartCard from "@/components/ui/ChartCard.jsx";
import ProductSalesInsights from "./Inventory/components/ProductSalesInsights.jsx";
import BarList from "@/components/ui/BarList.jsx";
import Segmented from "@/components/ui/Segmented.jsx";
import {
  fetchRevenueTrend,
  fetchAppointmentsBreakdown,
  fetchClientGrowth,
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

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: "custom", label: "Custom" },
];

function DateRangeControl({ range, onChange }) {
  const [preset, setPreset] = useState(30);

  function pick(value) {
    setPreset(value);
    if (value !== "custom") onChange(daysAgoRange(value));
  }

  const dateClass =
    "min-w-0 flex-1 sm:flex-none min-h-10 text-xs px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 [color-scheme:light] dark:[color-scheme:dark]";

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <Segmented
        label="Date range"
        options={RANGE_OPTIONS}
        value={preset}
        onChange={pick}
        className="w-full sm:w-96"
      />
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="From"
            value={range.start_date}
            max={range.end_date}
            onChange={(e) => onChange({ ...range, start_date: e.target.value })}
            className={dateClass}
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            aria-label="To"
            value={range.end_date}
            min={range.start_date}
            max={toDateString(new Date())}
            onChange={(e) => onChange({ ...range, end_date: e.target.value })}
            className={dateClass}
          />
        </div>
      )}
    </div>
  );
}

// ── Chart primitives (inline SVG, no library) ──────────────────────────

const CHART_H = 220;
const CHART_PAD = { top: 12, right: 12, bottom: 24, left: 52 }; // left fits "₱16,000"

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
  const [boxRef, width] = useBoxWidth(640);
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

  // At most ~6 x-axis labels, fewer when narrow (~55px per label).
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.min(6, innerW / 55)));
  // The last day is always labelled, unless it would crowd the one before.
  const lastFits = (data.length - 1) % labelEvery >= labelEvery / 2;

  return (
    <div ref={boxRef} className="analytics-viz">
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
          const isLast = i === data.length - 1;
          if (i % labelEvery !== 0 && !(isLast && lastFits)) return null;
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

// "Full Grooming" -> "Full Gro…" when only `max` characters fit.
const fitLabel = (text, max) =>
  text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;

// Vertical bar chart for a small set of categories.
function BarChart({ data, valueKey, labelKey, colorVar, formatValue = (v) => v }) {
  const [boxRef, width] = useBoxWidth(320);
  const innerW = width - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  const maxVal = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  const ticks = niceTicks(maxVal);
  const yMax = ticks[ticks.length - 1];
  const y = scaleLinear(yMax, innerH);
  const bandW = innerW / data.length;
  const barW = Math.min(48, bandW * 0.55);

  return (
    <div ref={boxRef} className="analytics-viz">
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
                {/* Long names (e.g. "Full Grooming") ran into each other:
                    cut to fit the bar's slot (~5.5 units per character at
                    font-size 10); the full name stays in the tooltip. */}
                <title>{d[labelKey]}</title>
                {fitLabel(String(d[labelKey] ?? ""), Math.floor(bandW / 5.5))}
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

const formatShortDate = (day) =>
  new Date(`${String(day).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

// Status colours — easy to tell apart, and in lightness too (not hue alone).
const STATUS_BAR = {
  Completed: "bg-[#2f9e44]",
  "In Queue": "bg-[#5b9cff]",
  Pending: "bg-[#a78bfa]",
  "No Show": "bg-[#f5b83d]",
  Cancelled: "bg-[#e5484d]",
};

// One stacked bar (share of each status) with a legend of counts.
function StatusBreakdown({ rows }) {
  const items = rows
    .map((r) => ({ name: r.appointment_status_name, count: Number(r.count) || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const total = items.reduce((sum, r) => sum + r.count, 0) || 1;
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={items.map((r) => `${r.name} ${r.count}`).join(", ")}
        className="flex h-3.5 gap-0.5 rounded-full overflow-hidden"
      >
        {items.map((r) => (
          <div
            key={r.name}
            className={STATUS_BAR[r.name] ?? "bg-slate-400"}
            style={{ width: `${(r.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        {items.map((r) => (
          <li key={r.name} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2 rounded-[3px] ${STATUS_BAR[r.name] ?? "bg-slate-400"}`} />
            {r.name}
            <strong className="text-slate-900 dark:text-white">{formatCount(r.count)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

  const clientGrowthQuery = useQuery({
    queryKey: ["AnalyticsClientGrowth", range.start_date, range.end_date],
    queryFn: ({ signal }) => fetchClientGrowth({ ...range, signal }),
  });

  const criticalStockQuery = useQuery({
    queryKey: ["AnalyticsCriticalStock"],
    queryFn: ({ signal }) => fetchCriticalStock({ signal }),
  });

  const expiredCount =
    criticalStockQuery.data?.filter((p) => p.is_expired).length ?? 0;

  const [peakBy, setPeakBy] = useState("hours");
  const peak = peakTimesQuery.data;
  const peakRows =
    peakBy === "hours"
      ? (peak?.byHour ?? []).map((d) => ({ ...d, label: formatHourLabel(d.hour), isPeak: peak?.peakHour?.hour === d.hour }))
      : (peak?.byDay ?? []).map((d) => ({ ...d, label: formatDayShort(d.day_name), isPeak: peak?.peakDay?.day_of_week === d.day_of_week }));
  const peakSubtitle =
    peakBy === "hours"
      ? peak?.peakHour
        ? `Busiest: ${formatHourLabel(peak.peakHour.hour)} (${formatCount(peak.peakHour.count)} bookings)`
        : "Bookings by hour of day"
      : peak?.peakDay
        ? `Busiest: ${peak.peakDay.day_name} (${formatCount(peak.peakDay.count)} bookings)`
        : "Bookings by day of week";

  const newClientsTotal = (clientGrowthQuery.data ?? []).reduce(
    (sum, d) => sum + (Number(d.new_clients) || 0),
    0,
  );

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
    <div className="w-full space-y-4 sm:space-y-5 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-[13px] sm:text-sm text-slate-500 mt-0.5 dark:text-slate-400">
            Revenue, appointments, sales, and client trends.
          </p>
        </div>
        <DateRangeControl range={range} onChange={setRange} />
      </div>

      {/* Revenue trend */}
      <ChartCard
        title="Revenue trend"
        subtitle="Sales (cart checkouts) vs services (appointments)"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        <ChartCard
          title="Appointments by service"
          isPending={appointmentsQuery.isPending}
          isError={appointmentsQuery.isError}
          error={appointmentsQuery.error}
          isEmpty={(appointmentsQuery.data?.byService?.length ?? 0) === 0}
        >
          <BarList
            barClass="bg-red-600 dark:bg-[#e5484d]"
            items={[...(appointmentsQuery.data?.byService ?? [])]
              .sort((a, b) => b.count - a.count)
              .map((d) => ({ label: d.service_name, value: Number(d.count) }))}
          />
        </ChartCard>

        <ChartCard
          title="Appointments by status"
          isPending={appointmentsQuery.isPending}
          isError={appointmentsQuery.isError}
          error={appointmentsQuery.error}
          isEmpty={(appointmentsQuery.data?.byStatus?.length ?? 0) === 0}
        >
          <StatusBreakdown rows={appointmentsQuery.data?.byStatus ?? []} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        <ChartCard
          title="Most frequent patients"
          subtitle="Excludes cancelled and no-show visits"
          isPending={appointmentsQuery.isPending}
          isError={appointmentsQuery.isError}
          error={appointmentsQuery.error}
          isEmpty={(appointmentsQuery.data?.topPets?.length ?? 0) === 0}
        >
          <BarList
            stacked
            items={(appointmentsQuery.data?.topPets ?? []).map((d) => ({
              label: d.pet_label,
              value: Number(d.count),
              display: `${formatCount(d.count)} ${Number(d.count) === 1 ? "visit" : "visits"}`,
            }))}
          />
        </ChartCard>

        {/* Peak hours / days: booking demand, every non-deleted appointment
            in range, any status (same scope as the breakdown above). */}
        <ChartCard
          title="Peak times"
          subtitle={peakSubtitle}
          action={
            <Segmented
              size="sm"
              label="Peak by"
              options={[
                { value: "hours", label: "Hours" },
                { value: "days", label: "Days" },
              ]}
              value={peakBy}
              onChange={setPeakBy}
            />
          }
          isPending={peakTimesQuery.isPending}
          isError={peakTimesQuery.isError}
          error={peakTimesQuery.error}
          isEmpty={peakRows.length === 0}
        >
          <BarChart
            data={peakRows}
            valueKey="count"
            labelKey="label"
            colorVar={(d) => (d.isPeak ? "--status-good" : "--slot-1")}
            formatValue={formatCount}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* Client growth */}
        <ChartCard
          title="Client growth"
          subtitle="New clients registered"
          action={
            clientGrowthQuery.isSuccess && (
              <div className="text-right">
                <p className="text-2xl font-extrabold leading-none text-slate-900 dark:text-white">
                  {formatCount(newClientsTotal)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 dark:text-slate-400">this period</p>
              </div>
            )
          }
          isPending={clientGrowthQuery.isPending}
          isError={clientGrowthQuery.isError}
          error={clientGrowthQuery.error}
          isEmpty={newClientsTotal === 0}
        >
          <ul className="divide-y divide-slate-100 dark:divide-[#1f241f] max-h-64 overflow-y-auto">
            {[...(clientGrowthQuery.data ?? [])]
              .filter((d) => Number(d.new_clients) > 0)
              .reverse()
              .map((d) => (
                <li key={d.day} className="flex items-center justify-between py-2 text-[13px]">
                  <span className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                    <span aria-hidden="true" className="size-2 rounded-full bg-teal-500 dark:bg-[#6fe0d0]" />
                    {formatShortDate(d.day)}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    +{formatCount(d.new_clients)} {Number(d.new_clients) === 1 ? "client" : "clients"}
                  </span>
                </li>
              ))}
          </ul>
        </ChartCard>

        {/* Best sellers + fast/slow movers: same section as Inventory's Product Sales tab */}
        <ProductSalesInsights />
      </div>

      {/* Critical stock */}
      <ChartCard
        title="Critical stock"
        subtitle="Low or out of stock, plus anything expired or expiring within 5 months"
        action={
          <Link
            to="/inventory"
            className="inline-flex items-center min-h-9 text-xs font-bold text-indigo-700 hover:text-indigo-800 dark:text-[#74d983] dark:hover:text-[#a3e9ab] whitespace-nowrap"
          >
            Inventory ›
          </Link>
        }
        isPending={criticalStockQuery.isPending}
        isError={criticalStockQuery.isError}
        error={criticalStockQuery.error}
        isEmpty={false}
      >
        {(criticalStockQuery.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400 italic dark:text-slate-500">
            No products are low/out of stock or nearing expiry.
          </p>
        ) : (
          <>
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1f241f] -mt-1">
              {criticalStockQuery.data.map((p) => (
                <li key={p.product_id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate dark:text-white">{p.product_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Qty {p.product_quantity} · Expires {formatExpiryDate(p.product_expiry_date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {(p.status_name === "Low Stock" || p.status_name === "Out of Stock") && (
                      <StockStatusBadge status={p.status_name} />
                    )}
                    {(p.is_expired || p.expiring_soon) && <ExpiryBadge isExpired={p.is_expired} />}
                  </div>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              disabled={expiredCount === 0}
              onClick={() => setShowPullExpired(true)}
              className="mt-3 w-full sm:w-auto flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 disabled:text-slate-400 disabled:border-slate-200 dark:text-[#ff8a8a] dark:border-[#5a2327] dark:bg-transparent dark:hover:bg-[#2b1214] dark:disabled:text-slate-600 dark:disabled:border-slate-800"
            >
              <Trash2 size={14} />
              <span>Remove expired{expiredCount > 0 ? ` (${expiredCount})` : ""}</span>
            </Button>
          </>
        )}
      </ChartCard>

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
      queryKey: ["AnalyticsClientGrowth", range.start_date, range.end_date],
      queryFn: ({ signal }) => fetchClientGrowth({ ...range, signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["AnalyticsCriticalStock"],
      queryFn: ({ signal }) => fetchCriticalStock({ signal }),
    }),
  ]);
  return null;
}
