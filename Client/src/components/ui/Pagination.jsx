// components/ui/Pagination.jsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button.jsx";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  total,
  limit,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = getPageWindow(page, totalPages);

  const rangeStart = total && limit ? (page - 1) * limit + 1 : null;
  const rangeEnd = total && limit ? Math.min(page * limit, total) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
      {total != null && limit != null ? (
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing{" "}
          <span className="text-slate-900 dark:text-white font-semibold">
            {rangeStart}
          </span>
          –
          <span className="text-slate-900 dark:text-white font-semibold">
            {rangeEnd}
          </span>{" "}
          of{" "}
          <span className="text-slate-900 dark:text-white font-semibold">
            {total}
          </span>{" "}
          rows
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center justify-center gap-1">
        {/* Previous Page Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page === 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 dark:hover:border-slate-700 disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </Button>

        {/* Page Numbers */}
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-slate-400 dark:text-slate-500 text-xs select-none"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-[32px] px-2 text-xs font-medium transition-colors ${
                p === page
                  ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 border-transparent font-semibold"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:hover:border-slate-700"
              }`}
            >
              {p}
            </Button>
          ),
        )}

        {/* Next Page Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 dark:hover:border-slate-700 disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

// Builds a windowed page list, e.g. [1, "...", 4, 5, 6, "...", 20]
function getPageWindow(current, total, siblingCount = 1) {
  const totalNumbers = siblingCount * 2 + 5;
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblingCount, 2);
  const right = Math.min(current + siblingCount, total - 1);

  const pages = [1];
  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("...");
  pages.push(total);

  return pages;
}
