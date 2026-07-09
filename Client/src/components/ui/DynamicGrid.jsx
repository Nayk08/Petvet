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

export default function DynamicGrid({
  data = [],
  columnsConfig = [],
  actions = [],
  title = "Dynamic Grid",
  buttonText = "Add New",
  buttonLink = "",
  onEdit, // (row) => void
  onDelete, // (row) => void
  confirmDeleteMessage = (row) =>
    `Are you sure you want to delete "${row.name ?? row.id}"?`,
}) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const visibleColumns = useMemo(() => {
    return columnsConfig.filter((col) => !hiddenColumns.has(col.key));
  }, [columnsConfig, hiddenColumns]);

  const processedRows = useMemo(() => {
    return data.filter((row) => {
      const passesDropdowns = Object.entries(columnFilters).every(
        ([colKey, selectedValue]) => {
          if (!selectedValue) return true;
          const rowValue = row[colKey];
          return String(rowValue) === String(selectedValue);
        },
      );

      if (!passesDropdowns) return false;

      if (!globalSearch.trim()) return true;
      const lowerSearch = globalSearch.toLowerCase();
      return visibleColumns.some((col) => {
        const cellValue = String(row[col.key] || "").toLowerCase();
        return cellValue.includes(lowerSearch);
      });
    });
  }, [data, globalSearch, columnFilters, visibleColumns]);

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
    setColumnFilters({});
    setGlobalSearch("");
  };

  const hasActiveFilters =
    Object.values(columnFilters).some(Boolean) || globalSearch;

  const navigation = useNavigate();

  // Built-in Edit/Delete get merged with any custom actions passed in
  const resolvedActions = useMemo(() => {
    const builtIn = [];

    if (onEdit) {
      builtIn.push({
        label: "Edit",
        icon: Pencil,
        className:
          "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10",
        onClick: (row) => onEdit(row),
      });
    }

    if (onDelete) {
      builtIn.push({
        label: "Delete",
        icon: Trash2,
        className: "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10",
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
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
          {title}
        </h1>
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
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-900 w-full relative z-10">
        <div className="flex flex-col md:flex-row flex-1 items-stretch md:items-center gap-3">
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search records..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1">
            {columnsConfig
              .filter(
                (col) => col.filterOptions && col.filterOptions.length > 0,
              )
              .map((col) => (
                <select
                  key={col.key}
                  value={columnFilters[col.key] || ""}
                  onChange={(e) =>
                    setColumnFilters({
                      ...columnFilters,
                      [col.key]: e.target.value,
                    })
                  }
                  className={`text-xs px-2.5 py-2 bg-slate-950 border rounded-lg text-slate-300 focus:outline-none transition-all cursor-pointer max-w-[160px] truncate ${
                    columnFilters[col.key]
                      ? "border-indigo-500 bg-indigo-950/20 text-indigo-400"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <option value="">All {col.label}</option>
                  {col.filterOptions.map((opt) => (
                    <option
                      key={opt.key}
                      value={opt.value}
                      className="bg-slate-950 text-white"
                    >
                      {opt.value}
                    </option>
                  ))}
                </select>
              ))}

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-lg cursor-pointer w-full"
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
              <div className="absolute right-0 mt-2 w-56 bg-slate-950 border border-slate-800 rounded-xl p-2 z-50 max-h-64 overflow-y-auto shadow-2xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 border-b border-slate-900 mb-1">
                  Toggle Fields
                </div>
                {columnsConfig.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumnVisibility(col.key)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <span>{col.label}</span>
                    {hiddenColumns.has(col.key) ? (
                      <EyeOff size={14} className="text-slate-600" />
                    ) : (
                      <Eye size={14} className="text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- Main Table Layout --- */}
      <div className="w-full rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden relative z-0">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader className="bg-slate-900/80 border-b border-slate-800">
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="py-3 text-sm text-slate-300 font-semibold min-w-[140px]"
                  >
                    {col.label}
                  </TableHead>
                ))}

                {resolvedActions.length > 0 && (
                  <TableHead className="py-3 text-sm text-slate-300 font-semibold min-w-[120px]">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedRows.length > 0 ? (
                processedRows.map((row, index) => (
                  <TableRow
                    key={row.id || index}
                    className="border-b border-slate-900 hover:bg-slate-900/40 transition-colors"
                  >
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        className="text-sm text-slate-300 py-3.5"
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] !== undefined && row[col.key] !== null
                            ? String(row[col.key])
                            : "—"}
                      </TableCell>
                    ))}

                    {resolvedActions.length > 0 && (
                      <TableCell className="py-3.5">
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
                    className="text-center py-12 text-sm text-slate-500"
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
