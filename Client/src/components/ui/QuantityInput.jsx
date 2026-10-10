import { useEffect, useState } from "react";

// Typeable quantity box (POS order panel, checkout cart). Keeps its own draft
// text while typing so digits aren't overwritten on every keystroke, then
// commits on blur or Enter, clamped to [1, maxStock]. Clicking selects the
// number so a new amount can be typed straight over it.
export default function QuantityInput({ quantity, maxStock, onCommit, className = "", label = "Quantity" }) {
  const [draft, setDraft] = useState(String(quantity));

  useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  const commit = () => {
    const parsed = parseInt(draft, 10);
    const next = Number.isNaN(parsed)
      ? quantity
      : Math.max(1, Math.min(parsed, maxStock ?? Infinity));
    // Show the real (clamped) value even when it equals the old quantity.
    setDraft(String(next));
    if (next !== quantity) onCommit(next);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      max={maxStock ?? undefined}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.target.blur();
      }}
      aria-label={label}
      className={`text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 focus:outline-none rounded-lg transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
    />
  );
}
