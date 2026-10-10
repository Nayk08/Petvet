import { TrendingUp, TrendingDown } from "lucide-react";

function TrendPill({ trend, direction = "up", className = "" }) {
  const Icon = direction === "down" ? TrendingDown : TrendingUp;
  const colorClasses =
    direction === "down"
      ? "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400"
      : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${colorClasses} ${className}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {trend}
    </span>
  );
}

export default function Container({
  title,
  value,
  trend,
  trendDirection = "up",
  trendLabel,
  breakdown,
  variant = "row",
  className = "",
  onClick,
}) {
  const isHero = variant === "hero";
  const breakdownTotal = breakdown?.reduce((sum, b) => sum + b.value, 0) ?? 0;
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={`bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 ${isClickable ? "cursor-pointer" : ""} ${className}`}
    >
      {isHero ? (
        <div className="flex flex-col">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight dark:text-white">
            {value}
          </p>
          {trend && (
            <TrendPill
              trend={trendLabel ? `${trend} ${trendLabel}` : trend}
              direction={trendDirection}
              className="self-start mt-2.5"
            />
          )}

          {breakdown?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              {breakdown.map((b) => {
                const pct = breakdownTotal
                  ? (b.value / breakdownTotal) * 100
                  : 0;
                return (
                  <div key={b.label}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">
                        {b.label}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {b.displayValue}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
              {title}
            </p>
            <p className="text-base sm:text-xl font-extrabold text-slate-900 mt-1 tracking-tight dark:text-white break-words">
              {value}
            </p>
          </div>
          {trend && <TrendPill trend={trend} direction={trendDirection} />}
        </div>
      )}
    </div>
  );
}
