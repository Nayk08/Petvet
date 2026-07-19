import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Filter,
  EyeOff,
  Eye,
  Search,
  X,
  Pencil,
  Trash2,
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
  confirmDeleteMessage = (row) =>
    `Are you sure you want to delete "${row.name ?? row.id}"?`,
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
  const [deletingId, setDeletingId] = useState(null);

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
    ) || search;

  const navigation = useNavigate();

  const resolvedActions = useMemo(() => {
    const builtIn = [];

    if (onEdit) {
      builtIn.push({
        label: "Edit",
        icon: Pencil,
        className: "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10",
        onClick: (row) => onEdit(row),
      });
    }

    if (onDelete) {
      builtIn.push({
        label: "Delete",
        icon: Trash2,
        className: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
        onClick: (row) => onDelete(row),
      });
    }

    return [...builtIn, ...actions];
  }, [onEdit, onDelete, actions, deletingId]);

  const totalColumnsCount =
    visibleColumns.length + (resolvedActions.length > 0 ? 1 : 0);

  return (
    <div className="space-y-4 w-full">
      {/* --- Top Header Bar --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold text-white tracking-wide">{title}</h1>
        <div className="ms-5">
          <Button asChild variant="neon" size="default">
            <Link to={buttonLink} className="flex items-center">
              <Plus size={16} className="text-white mr-1" />
              <span>{buttonText}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* --- Action Toolbar --- */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-[#0b0e17] p-3 rounded-xl border border-[#1e253a] w-full relative z-10">
        <div className="flex flex-col md:flex-row flex-1 items-stretch md:items-center gap-3">
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#070911] border border-[#1e253a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
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
                    className={`text-xs px-2.5 py-2 bg-[#070911] border rounded-lg text-slate-300 focus:outline-none transition-all cursor-pointer max-w-[160px] truncate ${
                      filters[col.key]
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-[#1e253a] hover:border-[#2a3350]"
                    }`}
                  >
                    <option value="">All {col.label}</option>
                    {col.filterOptions.map((opt) => (
                      <option
                        key={opt.key}
                        value={opt.value}
                        className="bg-[#070911] text-white"
                      >
                        {opt.label ?? opt.value}
                      </option>
                    ))}
                  </select>
                ),
              )}

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
        {onLimitChange && (
          <div className="shrink-0">
            <select
              value={limit ?? 10}
              onChange={(e) => {
                const value = e.target.value;
                onLimitChange(value === "all" ? "all" : Number(value));
              }}
              className="text-sm px-3 py-2 bg-[#070911] border border-[#1e253a] rounded-lg text-slate-300 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-[#070911] hover:bg-[#121627] border border-[#1e253a] text-slate-300 hover:text-white rounded-lg cursor-pointer w-full transition-colors"
          >
            <Filter size={16} />
            <span>Columns</span>
          </button>

          {showColumnDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowColumnDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-[#070911] border border-[#1e253a] rounded-xl p-2 z-50 max-h-64 overflow-y-auto shadow-2xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 border-b border-[#1e253a] mb-1">
                  Toggle Fields
                </div>
                {columnsConfig.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumnVisibility(col.key)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[#121627] transition-colors cursor-pointer"
                  >
                    <span>{col.label}</span>
                    {hiddenColumns.has(col.key) ? (
                      <EyeOff size={14} className="text-slate-600" />
                    ) : (
                      <Eye size={14} className="text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- Main Table Layout --- */}
      <div className="w-full rounded-xl border border-[#1e253a] bg-[#0b0e17] overflow-hidden relative z-0">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader className="bg-[#070911]/50 border-b border-[#1e253a]">
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-[140px]"
                  >
                    {col.label}
                  </TableHead>
                ))}

                {resolvedActions.length > 0 && (
                  <TableHead className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-[120px]">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#1e253a]/70">
              {data.length > 0 ? (
                data.map((row, index) => (
                  <TableRow
                    key={row.id || index}
                    className="hover:bg-[#111627]/40 transition-colors group"
                  >
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        className="text-sm text-slate-300 py-3.5 px-4"
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] !== undefined && row[col.key] !== null
                            ? String(row[col.key])
                            : "—"}
                      </TableCell>
                    ))}

                    {resolvedActions.length > 0 && (
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          {resolvedActions.map((action, i) => {
                            const Icon = action.icon;
                            const loading = action.isLoading?.(row);
                            return (
                              <button
                                key={i}
                                disabled={loading}
                                onClick={() => action.onClick(row)}
                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
                              >
                                {Icon && <Icon size={13} />}
                                {loading ? "Deleting..." : action.label}
                              </button>
                            );
                          })}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={totalColumnsCount}
                    className="text-center py-12 text-sm text-slate-500 italic"
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
