// Segmented control: one choice of a few, the active one filled green.
// options: [{ value, label }]. `size="sm"` for card-header toggles.
export default function Segmented({ options, value, onChange, label, size = "md", className = "" }) {
  const sm = size === "sm";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`grid gap-1 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 ${sm ? "p-0.75" : "p-1"} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`rounded-[9px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
              sm ? "min-h-8 px-3 text-xs" : "min-h-9.5 px-2 text-xs sm:text-[13px]"
            } ${
              on
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
