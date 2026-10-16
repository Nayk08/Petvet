import React, { useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Filter,
  EyeOff,
  Eye,
  Search,
  X,
  Pencil,
  Trash2,
  DoorOpen,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Button } from "./button.jsx";
import { MultiSelectFilter } from "./MultiSelectFilter";

// Phone card layout: which columns become the "#id", the status pill and the
// bold title (first match wins). Pet titles also show the owner.
const CARD_ID_KEYS = ["appointment_id", "product_id", "client_id", "control_number", "id"];
const CARD_STATUS_KEYS = ["appointment_status_name", "payment_status_name", "status_name", "status", "is_active", "active"];
const CARD_TITLE_KEYS = ["pets_name", "pet_name", "patient", "name", "product_name", "user_name", "appointment_services", "user_level", "tier_name", "client_name", "service_name", "total_amount"];
const PET_KEYS = ["pets_name", "pet_name", "patient"];

export default function DynamicGrid({
  data = [],
  columnsConfig = [],
  actions = [],
  title = "Dynamic Grid",
  subtitle = "Real-time status tracking and record management.",
  buttonText = "Add New",
  buttonLink = "",
  onEdit,
  onDelete,
  onView,
  onProcess,
  onPet,
  canEdit = () => true,
  canView = () => true,
  canProcess = () => true,
  canDelete = () => true,
  canPet = () => true,
  limit,
  onLimitChange,
  limitOptions = [10, 20, 50, "all"],
  search = "",
  onSearchChange,
  filters = {},
  onFiltersChange,
  // For embedding inside something that already provides its own card
  // chrome and heading (e.g. a Dialog) — skips the outer bordered/shadowed
  // card wrapper and the title/description header bar, keeping just the
  // toolbar (search/filters/columns) and the table itself.
  bare = false,
  // Optional extra control(s) rendered in the toolbar next to "Columns"
  // (e.g. a "Generate Report" button) — for page-specific actions that
  // don't belong in this shared component itself.
  extraActions,
}) {
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // filterOnly columns contribute a filter control (e.g. filtering by a
  // unique staff ID) without being a real, toggleable table column.
  const tableColumnsConfig = useMemo(
    () => columnsConfig.filter((col) => !col.filterOnly),
    [columnsConfig],
  );

  const visibleColumns = useMemo(() => {
    return tableColumnsConfig.filter((col) => !hiddenColumns.has(col.key));
  }, [tableColumnsConfig, hiddenColumns]);

  // Fit the table's scroll box to the space left in the window, so the
  // page itself doesn't scroll too (a second scrollbar) unless other content
  // really needs it. Never shorter than 480px. Inside dialogs (bare) the CSS
  // max-height on the box is used instead.
  const tableWrapRef = useRef(null);
  useLayoutEffect(() => {
    if (bare) return;
    const fit = () => {
      const box = tableWrapRef.current?.querySelector('[data-slot="table-container"]');
      if (!box || !box.offsetParent) return; // hidden on phones
      // Below md the app scrolls <main>, not the window: keep the CSS max-height.
      if (window.innerWidth < 768) {
        box.style.maxHeight = "";
        return;
      }
      box.style.maxHeight = "none";
      const top = box.getBoundingClientRect().top + window.scrollY;
      const below = document.documentElement.scrollHeight - (top + box.offsetHeight);
      // Enough room: fill it exactly (no second scrollbar). Not enough —
      // the page scrolls anyway (e.g. cards above the table), so use most
      // of the screen instead of shrinking to a few rows.
      const room = Math.floor(window.innerHeight - top - below);
      box.style.maxHeight = `${room >= 480 ? room : Math.max(480, Math.floor(window.innerHeight * 0.75))}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [bare, data.length, visibleColumns.length]);

  const toggleColumnVisibility = (columnKey) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        if (next.size < tableColumnsConfig.length - 1) next.add(columnKey);
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    onFiltersChange?.({});
    onSearchChange?.("");
  };

  const hasActiveFilters =
    Object.values(filters).some((v) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v),
    ) || Boolean(search);
  const activeFilterCount = Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v),
  ).length;

  // Phones: filters and the rows-per-page picker sit behind a Filters
  // button next to search (the design's toolbar); without a search box
  // there's nothing to sit next to, so they stay visible.
  const [showPhoneFilters, setShowPhoneFilters] = useState(false);
  const hasPhoneFilterToggle =
    Boolean(onSearchChange) &&
    Boolean(
      onLimitChange ||
        (onFiltersChange &&
          columnsConfig?.some(
            (col) =>
              col.filterType === "date" ||
              col.filterType === "dateRange" ||
              col.filterOptions?.length > 0,
          )),
    );
  const phoneFiltersHidden = hasPhoneFilterToggle && !showPhoneFilters ? "max-sm:hidden" : "";

  const handleDelete = useCallback(
    (row) => {
      onDelete?.(row);
    },
    [onDelete],
  );

  const resolvedActions = useMemo(() => {
    const builtIn = [];

    if (onEdit) {
      builtIn.push({
        label: "Edit",
        icon: Pencil,
        className:
          "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50",
        onClick: (row) => onEdit(row),
        show: canEdit,
      });
    }

    if (onView) {
      builtIn.push({
        label: "View",
        icon: Eye,
        className:
          "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
        onClick: (row) => onView(row),
        show: canView,
      });
    }

    if (onProcess) {
      builtIn.push({
        label: "Process",
        icon: Filter,
        className:
          "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50",
        onClick: (row) => onProcess(row),
        show: canProcess,
      });
    }

    if (onDelete) {
      builtIn.push({
        label: "Delete",
        icon: Trash2,
        className:
          "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-rose-400 dark:hover:bg-rose-950/50",
        onClick: handleDelete,
        show: canDelete,
      });
    }

    if (onPet) {
      builtIn.push({
        label: "Pet",
        icon: DoorOpen,
        className:
          "text-pink-600 hover:text-pink-700 hover:bg-greeb-50 dark:text-green-400 dark:hover:bg-green-950/50",
        onClick: (row) => onPet(row),
        show: canPet,
      });
    }

    return [...builtIn, ...actions];
  }, [
    onEdit,
    onDelete,
    onView,
    onProcess,
    actions,
    canEdit,
    canView,
    canProcess,
    canDelete,
    handleDelete,
    onPet,
    canPet,
  ]);

  const checkActionVisible = (action, row) => {
    if (action.show === undefined) return true;
    if (typeof action.show === "function") return action.show(row);
    return Boolean(action.show);
  };

  const getStatusBadgeStyle = (val) => {
    const status = String(val ?? "").toLowerCase();
    if (["completed", "in stock", "active", "valid"].includes(status)) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800";
    }
    if (["in progress", "low stock", "pending"].includes(status)) {
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800";
    }
    if (["out of stock", "expired", "inactive", "cancelled"].includes(status)) {
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800";
    }
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800";
  };

  // One cell value — shared by the table (tablet/desktop) and the phone cards.
  const renderCell = (col, row) =>
    col.render ? (
      col.render(row[col.key], row)
    ) : col.key === "id" || col.key === "product_id" ? (
      <span className="font-mono text-xs text-slate-500 font-semibold dark:text-slate-400">
        {row[col.key]}
      </span>
    ) : col.key === "name" || col.key === "product_name" || col.key === "patient" ? (
      <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-slate-100 dark:group-hover:text-indigo-300">
        {row[col.key]}
      </span>
    ) : col.key === "status" || col.key === "expired" ? (
      <span
        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full tracking-wide inline-flex items-center justify-center border ${getStatusBadgeStyle(
          row[col.key],
        )}`}
      >
        {row[col.key]}
      </span>
    ) : col.key === "service" || col.key === "type" ? (
      <span className="px-2.5 py-1 text-xs rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
        {row[col.key]}
      </span>
    ) : row[col.key] !== undefined && row[col.key] !== null ? (
      <span className="text-slate-700 dark:text-slate-300">{String(row[col.key])}</span>
    ) : (
      <span className="text-slate-400 dark:text-slate-600">—</span>
    );

  // A row's action buttons. icon/label/className can be a fixed value or a
  // (row) => value function, for actions whose appearance depends on that
  // row's own state (e.g. an Activate/Deactivate toggle).
  const renderActions = (row, rowActions) =>
    rowActions.map((action, i) => {
      const Icon = typeof action.icon === "function" ? action.icon(row) : action.icon;
      const label = typeof action.label === "function" ? action.label(row) : action.label;
      const className =
        typeof action.className === "function" ? action.className(row) : action.className;
      const loading = action.isLoading?.(row);
      return (
        <button
          key={i}
          type="button"
          disabled={loading}
          onClick={() => action.onClick(row)}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 max-sm:min-h-11 max-sm:px-3.5 max-sm:text-sm rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          {Icon && <Icon size={13} />}
          {loading ? "Processing..." : label}
        </button>
      );
    });

  const totalColumnsCount =
    visibleColumns.length + (resolvedActions.length > 0 ? 1 : 0);

  return (
    <div
      className={
        bare
          ? "w-full text-slate-800 dark:text-slate-100"
          : "bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm w-full text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 max-sm:bg-transparent max-sm:border-0 max-sm:px-0 max-sm:pb-0 max-sm:pt-3 max-sm:shadow-none max-sm:dark:bg-transparent"
      }
    >
      {/* Header Bar */}
      {!bare && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-1 sm:pb-6 sm:border-b border-slate-100 gap-3 sm:gap-4 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-xl font-extrabold sm:font-bold tracking-tight sm:tracking-wide text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
          {buttonLink && (
            <div className="shrink-0 max-sm:hidden">
              <Button asChild variant="default" size="default">
                <Link
                  to={buttonLink}
                  className="flex items-center gap-1.5 font-medium"
                >
                  <Plus size={16} />
                  <span>{buttonText}</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action Toolbar — a single flex-wrap row rather than nested
          viewport-breakpoint containers, so it reflows correctly based on
          how much space it ACTUALLY has (a narrow Dialog vs. the full
          page), not the browser window's width; md:/xl: prefixes fire off
          the viewport regardless of how narrow this component's own
          container is, which used to scramble the wrap order when this
          rendered inside a Dialog. */}
      <div
        className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 w-full relative z-20 ${bare ? "" : "pt-4"}`}
      >
        {/* Only when the page actually handles it — a box that does nothing
            when typed into looked like a broken search. */}
        {onSearchChange && (
        <div className="flex gap-2 w-full sm:w-64 shrink-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:bg-slate-950"
            />
          </div>
          {hasPhoneFilterToggle && (
            <button
              type="button"
              onClick={() => setShowPhoneFilters((open) => !open)}
              aria-expanded={showPhoneFilters}
              aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filters"}
              className={`sm:hidden relative size-11 shrink-0 flex items-center justify-center rounded-xl border cursor-pointer transition-colors ${
                showPhoneFilters || activeFilterCount
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-[#163a1e] dark:text-[#9be3a4] dark:border-[#2f7d3a]"
                  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              }`}
            >
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
        )}

        {/* Phones: filters wrap onto as many rows as they need (a hidden-
            scrollbar strip read as cut off). From sm up the wrapper
            disappears (contents) and they join the toolbar row. */}
        <div className={`flex flex-wrap gap-2 empty:hidden sm:contents ${phoneFiltersHidden}`}>
        {onFiltersChange && columnsConfig
              .filter(
                (col) =>
                  col.filterType === "date" ||
                  col.filterType === "dateRange" ||
                  (col.filterOptions && col.filterOptions.length > 0),
              )
              .map((col) =>
                col.filterType === "date" ? (
                  <input
                    key={col.key}
                    type="date"
                    value={filters[col.key] || ""}
                    onChange={(e) =>
                      onFiltersChange?.({
                        ...filters,
                        [col.key]: e.target.value,
                      })
                    }
                    title={col.label}
                    className={`shrink-0 max-sm:grow max-sm:min-h-11 text-xs px-2.5 py-2 bg-slate-50 border rounded-lg text-slate-600 focus:outline-none transition-all cursor-pointer dark:bg-slate-950 dark:text-slate-300 [color-scheme:light] dark:[color-scheme:dark] ${
                      filters[col.key]
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  />
                ) : col.filterType === "dateRange" ? (
                  <div key={col.key} data-daterange className="sm:shrink-0 max-sm:basis-full max-sm:min-w-0 flex items-center gap-1.5">
                    <input
                      type="date"
                      value={filters[`${col.key}_from`] || ""}
                      max={filters[`${col.key}_to`] || undefined}
                      onChange={(e) =>
                        onFiltersChange?.({
                          ...filters,
                          [`${col.key}_from`]: e.target.value,
                        })
                      }
                      title={`${col.label} from`}
                      className={`min-w-0 flex-1 sm:flex-none max-sm:min-h-11 text-xs px-2.5 py-2 bg-slate-50 border rounded-lg text-slate-600 focus:outline-none transition-all cursor-pointer dark:bg-slate-950 dark:text-slate-300 [color-scheme:light] dark:[color-scheme:dark] ${
                        filters[`${col.key}_from`]
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    />
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      to
                    </span>
                    <input
                      type="date"
                      value={filters[`${col.key}_to`] || ""}
                      min={filters[`${col.key}_from`] || undefined}
                      onChange={(e) =>
                        onFiltersChange?.({
                          ...filters,
                          [`${col.key}_to`]: e.target.value,
                        })
                      }
                      title={`${col.label} to`}
                      className={`min-w-0 flex-1 sm:flex-none max-sm:min-h-11 text-xs px-2.5 py-2 bg-slate-50 border rounded-lg text-slate-600 focus:outline-none transition-all cursor-pointer dark:bg-slate-950 dark:text-slate-300 [color-scheme:light] dark:[color-scheme:dark] ${
                        filters[`${col.key}_to`]
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    />
                  </div>
                ) : col.multiSelect ? (
                  <MultiSelectFilter
                    key={col.key}
                    label={col.label}
                    options={col.filterOptions}
                    selected={filters[col.key] || []}
                    onChange={(values) =>
                      onFiltersChange?.({ ...filters, [col.key]: values })
                    }
                  />
                ) : (
                  <select
                    key={col.key}
                    value={filters[col.key] || ""}
                    onChange={(e) =>
                      onFiltersChange?.({
                        ...filters,
                        [col.key]: e.target.value,
                      })
                    }
                    className={`shrink-0 max-sm:grow max-sm:min-h-11 text-xs px-2.5 py-2 bg-slate-50 border rounded-lg text-slate-600 focus:outline-none transition-all cursor-pointer sm:max-w-[160px] truncate dark:bg-slate-950 dark:text-slate-300 ${
                      filters[col.key]
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <option value="">All {col.label}</option>
                    {col.filterOptions.map((opt) => (
                      <option
                        key={opt.key ?? opt.value}
                        value={opt.value}
                        className="bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {opt.label ?? opt.value}
                      </option>
                    ))}
                  </select>
                ),
              )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="shrink-0 whitespace-nowrap flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-medium"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}

        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:ml-auto max-w-full sm:justify-end">
          {extraActions && (
            <div className="max-sm:order-2 flex flex-col gap-2 max-sm:[&>*]:w-full max-sm:[&>*]:min-h-11 max-sm:[&>*]:justify-center sm:contents">
              {extraActions}
            </div>
          )}
          {onLimitChange && (
            <div className={`shrink-0 max-sm:order-1 ${phoneFiltersHidden}`}>
              <select
                value={limit ?? 10}
                onChange={(e) => {
                  const value = e.target.value;
                  onLimitChange(value === "all" ? "all" : Number(value));
                }}
                className="w-full max-sm:min-h-11 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer font-semibold hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {limitOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "Show All" : `${opt} rows`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative shrink-0 max-sm:hidden">
            <button
              type="button"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="w-full max-sm:min-h-11 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer transition-colors dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Filter size={14} />
              <span>Columns</span>
            </button>

            {showColumnDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowColumnDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl p-2 z-50 max-h-64 overflow-y-auto shadow-xl dark:bg-slate-900 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-100 mb-1 dark:border-slate-800 dark:text-slate-500">
                    Toggle Fields
                  </div>
                  {tableColumnsConfig.map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleColumnVisibility(col.key)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <span>{col.label}</span>
                      {hiddenColumns.has(col.key) ? (
                        <EyeOff size={14} className="text-slate-400" />
                      ) : (
                        <Eye
                          size={14}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {buttonLink && !bare && (
            <Button asChild variant="default" size="default" className="sm:hidden order-3 w-full h-11">
              <Link to={buttonLink} className="flex items-center justify-center gap-1.5 font-medium">
                <Plus size={16} />
                <span>{buttonText}</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Phones: one card per row (label: value), actions at the bottom —
          a squeezed table only showed 3-4 columns behind a sideways scroll. */}
      <ul className="sm:hidden mt-4 space-y-3">
        {data.length > 0 ? (
          data.map((row, index) => {
            const rowActions = resolvedActions.filter((action) => checkActionVisible(action, row));
            // Design card: "#id" + status pill on top, the record's name as
            // a bold title (pet records also show "· owner"), every other
            // field as a compact two-column grid below.
            const idCol = visibleColumns.find((c) => CARD_ID_KEYS.includes(c.key));
            const statusCol = visibleColumns.find((c) => CARD_STATUS_KEYS.includes(c.key));
            const titleCol =
              CARD_TITLE_KEYS.map((k) => visibleColumns.find((c) => c.key === k)).find(Boolean) ??
              visibleColumns.find((c) => c !== idCol && c !== statusCol);
            const ownerCol =
              titleCol && PET_KEYS.includes(titleCol.key)
                ? visibleColumns.find((c) => c.key === "client_name")
                : null;
            const rest = visibleColumns.filter(
              (c) => ![idCol, statusCol, titleCol, ownerCol].includes(c),
            );
            return (
              <li
                key={row.id || index}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex flex-col gap-2.5 text-sm"
              >
                {(idCol || statusCol) && (
                  <div className="flex items-center justify-between gap-2 min-h-6">
                    <span className="text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                      {idCol && <>#{row[idCol.key]}</>}
                    </span>
                    {statusCol && <span className="shrink-0">{renderCell(statusCol, row)}</span>}
                  </div>
                )}
                {titleCol && (
                  <div className="text-base font-bold leading-snug text-slate-900 dark:text-white wrap-break-word">
                    {renderCell(titleCol, row)}
                    {ownerCol && row[ownerCol.key] && (
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {" "}· {row[ownerCol.key]}
                      </span>
                    )}
                  </div>
                )}
                {rest.length > 0 && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {rest.map((col) => (
                      <div key={col.key} className={`min-w-0 ${col.key.includes("email") || col.key === "description" ? "col-span-2" : ""}`}>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          {col.label}
                        </dt>
                        <dd className="mt-0.5 text-[13px] wrap-break-word">{renderCell(col, row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {rowActions.length > 0 && (
                  // Same placement on every page: equal-width outlined buttons,
                  // one row for 1–3 actions, two columns for 4 or more.
                  <div
                    className="grid gap-2 pt-1 [&>button]:w-full [&>button]:justify-center [&>button]:rounded-xl [&>button]:font-semibold [&>button]:border [&>button]:border-slate-200 dark:[&>button]:border-[#2a302a] dark:[&>button]:bg-slate-950"
                    style={{
                      gridTemplateColumns: `repeat(${rowActions.length <= 3 ? rowActions.length : 2}, minmax(0, 1fr))`,
                    }}
                  >
                    {renderActions(row, rowActions)}
                  </div>
                )}
              </li>
            );
          })
        ) : (
          <li className="text-center py-10 text-sm text-slate-400 dark:text-slate-500 italic">
            No matching records found.
          </li>
        )}
      </ul>

      {/* Main Table Layout (tablet and up) */}
      <div ref={tableWrapRef} className="hidden sm:block mt-4 relative z-0">
        <div className="w-full">
          {/* Own vertical scrollbar so long lists ("Show All") stay inside the
              card; the header row stays pinned while scrolling. Height is fitted
              to the window by the effect above. */}
          <Table
            className="w-full text-left border-collapse"
            containerClassName="max-h-[max(20rem,calc(100dvh-23rem))] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800"
          >
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {resolvedActions.length > 0 && (
                  <TableHead className="sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--color-slate-200)] dark:shadow-[inset_0_-1px_0_var(--color-slate-800)] py-4 px-4 text-[11px] font-bold text-left text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 min-w-[120px] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                    Actions
                  </TableHead>
                )}

                {visibleColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--color-slate-200)] dark:shadow-[inset_0_-1px_0_var(--color-slate-800)] py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 ${
                      col.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {data.length > 0 ? (
                data.map((row, index) => {
                  const rowActions = resolvedActions.filter((action) =>
                    checkActionVisible(action, row),
                  );

                  return (
                    <TableRow
                      key={row.id || index}
                      className="hover:bg-slate-50/80 transition-colors group dark:hover:bg-slate-800/60"
                    >
                      {resolvedActions.length > 0 && (
                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center justify-start gap-1.5">
                            {rowActions.length > 0 ? (
                              renderActions(row, rowActions)
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-600">
                                —
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`py-3.5 px-4 ${
                            col.align === "right" ? "text-right" : ""
                          }`}
                        >
                          {renderCell(col, row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={totalColumnsCount}
                    className="text-center py-12 text-sm text-slate-400 dark:text-slate-500 italic"
                  >
                    No matching records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
