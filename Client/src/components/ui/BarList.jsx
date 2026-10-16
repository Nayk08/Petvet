// Ranked horizontal bars as plain HTML: label and value on one line, the bar
// under it, scaled to the largest value. Text stays real text at any width.
// `stacked`: label + value above the bar (long labels); otherwise label,
// bar and value share one row.
export default function BarList({ items, barClass = "bg-indigo-600 dark:bg-[#5fd36e]", stacked = false }) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  const width = (v) => `${Math.max(2, ((Number(v) || 0) / max) * 100)}%`;

  if (stacked) {
    return (
      <ul className="flex flex-col gap-2.5">
        {items.map((i, idx) => (
          <li key={`${i.label}-${idx}`} className="flex flex-col gap-1">
            <div className="flex justify-between gap-3 text-xs">
              <span className="truncate text-slate-600 dark:text-slate-300" title={i.label}>{i.label}</span>
              <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-white">{i.display ?? i.value}</span>
            </div>
            <span className="h-2 rounded-full bg-slate-100 dark:bg-[#1f241f]">
              <span className={`block h-2 rounded-full ${barClass}`} style={{ width: width(i.value) }} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i, idx) => (
        <li key={`${i.label}-${idx}`} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-2.5 text-xs">
          <span className="truncate text-slate-600 dark:text-slate-300" title={i.label}>{i.label}</span>
          <span className="h-2.5 rounded-full bg-slate-100 dark:bg-[#1f241f]">
            <span className={`block h-2.5 rounded-full ${barClass}`} style={{ width: width(i.value) }} />
          </span>
          <span className="min-w-6 text-right font-bold tabular-nums text-slate-900 dark:text-white">{i.display ?? i.value}</span>
        </li>
      ))}
    </ul>
  );
}
