import React, { useMemo, useState, useCallback } from "react";
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

export default function DynamicGrid({
  data = [],
  columnsConfig = [],
  actions = [],
  title = "Dynamic Grid",
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
}) {
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  const visibleColumns = useMemo(() => {
    return columnsConfig.filter((col) => !hiddenColumns.has(col.key));
  }, [columnsConfig, hiddenColumns]);

  const toggleColumnVisibility = (columnKey) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        if (next.size < columnsConfig.length - 1) next.add(columnKey);
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

  const totalColumnsCount =
    visibleColumns.length + (resolvedActions.length > 0 ? 1 : 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm w-full text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100 gap-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-wide dark:text-white">
            {title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
            Real-time status tracking and record management.
          </p>
        </div>
        {buttonLink && (
          <div className="shrink-0">
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

      {/* Action Toolbar */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between pt-4 w-full relative z-20">
        <div className="flex flex-col md:flex-row flex-1 items-stretch md:items-center gap-3">
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-500 focus:bg-white transition-colors placeholder:text-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:bg-slate-950"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1">
            {columnsConfig
              .filter(
                (col) => col.filterOptions && col.filterOptions.length > 0,
              )
              .map((col) =>
                col.multiSelect ? (
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
                    className={`text-xs px-2.5 py-2 bg-slate-50 border rounded-lg text-slate-600 focus:outline-none transition-all cursor-pointer max-w-[160px] truncate dark:bg-slate-950 dark:text-slate-300 ${
                      filters[col.key]
                        ? "border-teal-600 bg-teal-50 text-teal-700 font-semibold dark:bg-teal-500/10 dark:text-teal-300"
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
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-medium"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onLimitChange && (
            <div className="shrink-0">
              <select
                value={limit ?? 10}
                onChange={(e) => {
                  const value = e.target.value;
                  onLimitChange(value === "all" ? "all" : Number(value));
                }}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:border-teal-500 transition-colors cursor-pointer font-semibold hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {limitOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "Show All" : `${opt} rows`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer transition-colors dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
                  {columnsConfig.map((col) => (
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
        </div>
      </div>

      {/* Main Table Layout */}
      <div className="overflow-x-auto mt-4 relative z-0">
        <div className="w-full">
          <Table className="w-full text-left border-collapse">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 ${
                      col.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {col.label}
                  </TableHead>
                ))}

                {resolvedActions.length > 0 && (
                  <TableHead className="py-4 px-4 text-[11px] font-bold text-center text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 min-w-[120px] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                    Actions
                  </TableHead>
                )}
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
                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`py-3.5 px-4 ${
                            col.align === "right" ? "text-right" : ""
                          }`}
                        >
                          {col.render ? (
                            col.render(row[col.key], row)
                          ) : col.key === "id" || col.key === "product_id" ? (
                            <span className="font-mono text-xs text-slate-500 font-semibold dark:text-slate-400">
                              {row[col.key]}
                            </span>
                          ) : col.key === "name" ||
                            col.key === "product_name" ||
                            col.key === "patient" ? (
                            <span className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors dark:text-slate-100 dark:group-hover:text-teal-300">
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
                          ) : row[col.key] !== undefined &&
                            row[col.key] !== null ? (
                            <span className="text-slate-700 dark:text-slate-300">
                              {String(row[col.key])}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">
                              —
                            </span>
                          )}
                        </TableCell>
                      ))}

                      {resolvedActions.length > 0 && (
                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {rowActions.length > 0 ? (
                              rowActions.map((action, i) => {
                                const Icon = action.icon;
                                const loading = action.isLoading?.(row);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => action.onClick(row)}
                                    className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
                                  >
                                    {Icon && <Icon size={13} />}
                                    {loading ? "Processing..." : action.label}
                                  </button>
                                );
                              })
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-600">
                                —
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
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
