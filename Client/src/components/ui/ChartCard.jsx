// Card wrapper for the inline-SVG charts (Analytics, Inventory product sales):
// title, optional subtitle, and loading / error / empty states.
export default function ChartCard({ title, subtitle, children, isPending, isError, error, isEmpty }) {
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
