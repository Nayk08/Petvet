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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-2 text-xs px-2.5 py-2 bg-[#070911] border rounded-lg text-slate-300 focus:outline-none transition-all cursor-pointer max-w-[180px] ${
          selected.length > 0
            ? "border-blue-500 bg-blue-500/10 text-blue-400"
            : "border-[#1e253a] hover:border-[#2a3350]"
        }`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute top-[100%] left-0 mt-1 w-48 bg-[#070911] border border-[#1e253a] rounded-xl p-1 z-50 shadow-2xl">
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <button
                key={opt.key}
                onClick={() => toggleValue(opt.value)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[#121627] transition-colors cursor-pointer"
              >
                <span>{opt.label ?? opt.value}</span>
                {isChecked && <Check size={14} className="text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
