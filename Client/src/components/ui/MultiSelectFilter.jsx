// components/ui/MultiSelectFilter.jsx
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export function MultiSelectFilter({ label, options, selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleValue = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayText =
    selected.length === 0
      ? `All ${label}`
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  const hasSelection = selected.length > 0;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg border focus:outline-none transition-all cursor-pointer min-w-[130px] max-w-[160px] ${
          hasSelection
            ? "border-teal-600 bg-teal-50 text-teal-700 font-semibold dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        }`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          } ${
            hasSelection
              ? "text-teal-600 dark:text-teal-300"
              : "text-slate-400 dark:text-slate-500"
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-[100%] left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl p-1 z-50 shadow-xl dark:bg-slate-950 dark:border-slate-800">
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <button
                key={opt.key ?? opt.value}
                type="button"
                onClick={() => toggleValue(opt.value)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white transition-colors cursor-pointer"
              >
                <span className="truncate">{opt.label ?? opt.value}</span>
                {isChecked && (
                  <Check
                    size={14}
                    className="text-teal-600 dark:text-teal-400 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
