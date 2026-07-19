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
    <div className="flex flex-col items-center gap-2 pt-4">
      {total != null && limit != null && (
        <div className="text-xs text-slate-500">
          Showing {rangeStart}–{rangeEnd} of {total} rows
        </div>
      )}

      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={14} />
        </Button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-slate-500 text-sm select-none"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "neon" : "ghost"}
              size="sm"
              disabled={disabled}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || page === totalPages}
          onClick={() => onPageChange(page + 1)}
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
