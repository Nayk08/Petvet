// Card wrapper for the Analytics / Inventory product-sales sections: title,
// optional subtitle and header control (`action`), and loading / error /
// empty states.
export default function ChartCard({ title, subtitle, action, children, isPending, isError, error, isEmpty }) {
  const state = "h-40 flex items-center justify-center text-sm";
  return (
    <section className="bg-white border border-slate-200 rounded-[18px] p-4 sm:p-5 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-3.5">
        {isPending ? (
          <div className={`${state} text-slate-400 dark:text-slate-500`}>Loading...</div>
        ) : isError ? (
          <div className={`${state} text-rose-500 dark:text-rose-400`}>{error?.message ?? "Failed to load"}</div>
        ) : isEmpty ? (
          <div className={`${state} text-slate-400 italic dark:text-slate-500`}>No data for this range.</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
