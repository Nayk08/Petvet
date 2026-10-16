import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Pencil, Search, Clock, UserRound, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import QueryState from "@/components/ui/QueryState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { optimisticMutation, removeWhere, patchWhere } from "@/api/optimistic.js";
import {
  fetchMaintenanceServiceCategories,
  fetchMaintenanceServices,
  setMaintenanceServiceActive,
  fetchMaintenanceGroomingTiers,
  deleteMaintenanceGroomingTier,
} from "@/api/http.js";
import ServiceModal from "./components/ServiceModal.jsx";
import GroomingTierModal from "./components/GroomingTierModal.jsx";

const GROOMING_CATEGORY_ID = 1; // fixed seed id (migrations/001)

// Both grids are small and fully loaded, so search filters them in place.
const matchesSearch = (term, ...values) =>
  !term ||
  values
    .flat()
    .filter((v) => v != null)
    .some((v) => String(v).toLowerCase().includes(term));

const peso = (n) =>
  `₱${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// One sub-service. Grooming cards also hold their weight tiers (smallest
// tier covering the pet's weight applies), opened in place.
function ServiceCard({
  service: s,
  showTiers,
  tiers,
  tiersLoading,
  tiersLoaded,
  tiersOpen,
  onToggleTiers,
  onAddTier,
  onEditTier,
  onDeleteTier,
  onEdit,
  onToggleActive,
}) {
  // The service row's own count until the tiers list has loaded (or if it
  // fails), so a weight-priced service never flashes its flat price.
  const tierCount = tiersLoaded ? tiers.length : Number(s.tier_count) || 0;
  const tiered = showTiers && tierCount > 0;
  const price = tiered
    ? `By pet weight · ${tierCount} ${tierCount === 1 ? "tier" : "tiers"}`
    : s.service_price != null
      ? peso(s.service_price)
      : "Priced at clinic";
  const roles = Array.isArray(s.allowed_roles) && s.allowed_roles.length ? s.allowed_roles.join(", ") : "Unassigned";
  const tiersId = `tiers-${s.appointment_services_id}`;

  return (
    <li
      className={`rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-2.5 dark:border-slate-800 dark:bg-slate-900 ${
        s.is_active ? "" : "opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">
          {s.appointment_services}
        </h2>
        <span
          className={`shrink-0 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
            s.is_active
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-[#10203a] dark:text-[#8fbcff] dark:border-[#22406e]"
              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#222622] dark:text-[#c0c6bf] dark:border-[#3a403a]"
          }`}
        >
          {s.is_active ? "Active" : "Deleted"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <span
          className={`font-bold ${
            tiered
              ? "text-indigo-700 dark:text-[#9be3a4]"
              : s.service_price == null
                ? "italic font-medium text-slate-500 dark:text-slate-400"
                : "text-slate-900 dark:text-white"
          }`}
        >
          {price}
        </span>
        {s.duration_minutes ? (
          <span className="flex items-center gap-1">
            <Clock size={13} aria-hidden="true" />
            {s.duration_minutes} min
          </span>
        ) : null}
        <span className="flex items-center gap-1 min-w-0">
          <UserRound size={13} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{roles}</span>
        </span>
      </div>

      {s.description && (
        <p className="text-[13px] leading-relaxed text-slate-500 line-clamp-3 dark:text-slate-400">{s.description}</p>
      )}

      {showTiers && s.is_active && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onToggleTiers}
            aria-expanded={tiersOpen}
            aria-controls={tiersId}
            className="self-start flex items-center gap-1.5 min-h-9 px-1 -mx-1 bg-transparent border-none cursor-pointer text-[13px] font-bold text-indigo-700 dark:text-[#74d983]"
          >
            <ChevronDown size={15} className={`transition-transform ${tiersOpen ? "rotate-180" : ""}`} />
            {tiersLoading
              ? "Loading tiers…"
              : tiers.length
                ? `${tiersOpen ? "Hide" : "Show"} ${tiers.length} weight ${tiers.length === 1 ? "tier" : "tiers"}`
                : "Price by pet weight"}
          </button>
          {tiersOpen && (
            <div id={tiersId} className="rounded-xl border border-slate-200 bg-slate-50 dark:border-[#232823] dark:bg-[#0f120f]">
              {tiers.length === 0 && (
                <p className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                  No tiers yet: the flat price above is charged. Add tiers to price by the pet’s weight.
                </p>
              )}
              <ul className="divide-y divide-slate-200 dark:divide-[#1f241f]">
                {tiers.map((t) => (
                  <li key={t.tier_id} className="flex items-center gap-2 pl-3 pr-1 py-1.5 text-[13px]">
                    <span className="font-bold text-slate-900 dark:text-white w-15 shrink-0 truncate">{t.tier_name}</span>
                    <span className="flex-1 min-w-0 truncate text-slate-500 dark:text-slate-400">
                      {t.max_weight_kg != null ? `≤ ${Number(t.max_weight_kg)} kg` : "No limit"}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">{peso(t.price)}</span>
                    <button
                      type="button"
                      onClick={() => onEditTier(t)}
                      aria-label={`Edit ${t.tier_name} tier`}
                      className="size-9 shrink-0 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTier(t)}
                      aria-label={`Delete ${t.tier_name} tier`}
                      className="size-9 shrink-0 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer text-red-600 hover:bg-red-50 dark:text-[#ff8a8a] dark:hover:bg-[#2b1214]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onAddTier}
                className="w-full flex items-center justify-center gap-1.5 min-h-10 border-t border-slate-200 dark:border-[#1f241f] bg-transparent cursor-pointer text-[13px] font-bold text-indigo-700 dark:text-[#74d983] rounded-b-xl"
              >
                <Plus size={14} />
                Add tier
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center justify-center gap-1.5 min-h-10 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-blue-700 cursor-pointer hover:bg-slate-50 dark:border-[#2a302a] dark:bg-slate-950 dark:text-[#8fbcff] dark:hover:bg-slate-900"
        >
          <Pencil size={14} />
          Edit
        </button>
        <button
          type="button"
          onClick={onToggleActive}
          className={`flex items-center justify-center gap-1.5 min-h-10 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:border-[#2a302a] dark:bg-slate-950 dark:hover:bg-slate-900 ${
            s.is_active ? "text-red-600 dark:text-[#ff8a8a]" : "text-emerald-700 dark:text-[#7ee08b]"
          }`}
        >
          {s.is_active ? <Trash2 size={14} /> : <RotateCcw size={14} />}
          {s.is_active ? "Delete" : "Restore"}
        </button>
      </div>
    </li>
  );
}

// Three fixed categories (Grooming / Consultation / Operation) — one tab
// each, listing only that category's sub-services. Categories themselves
// can't be added, renamed or deleted; sub-services can.
export function Component() {
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [editingService, setEditingService] = useState(null); // {} = add, row = edit
  const [editingTier, setEditingTier] = useState(null); // {} = add, row = edit
  const [confirmDeleteTier, setConfirmDeleteTier] = useState(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceFilters, setServiceFilters] = useState({});

  const categoriesQuery = useQuery({
    queryKey: ["maintenance-service-categories"],
    queryFn: ({ signal }) => fetchMaintenanceServiceCategories({ signal }),
    staleTime: Infinity, // fixed seed data
  });

  const servicesQuery = useQuery({
    queryKey: ["maintenance-services"],
    queryFn: ({ signal }) => fetchMaintenanceServices({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  const categories = categoriesQuery.data ?? [];
  const categoryId = activeCategoryId ?? categories[0]?.category_id;
  const activeCategory = categories.find((c) => c.category_id === categoryId);
  const serviceTerm = serviceSearch.trim().toLowerCase();
  const services = (servicesQuery.data ?? []).filter(
    (s) =>
      s.category_id === categoryId &&
      (!serviceFilters.is_active || String(s.is_active) === serviceFilters.is_active) &&
      matchesSearch(serviceTerm, s.appointment_services, s.description, s.allowed_roles),
  );

  // Optimistic: Active/Deleted flips at once (undone on failure).
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => setMaintenanceServiceActive(id, is_active),
    ...optimisticMutation({
      keys: [["maintenance-services"]],
      refresh: [["appointment-services"], ["portal-appointment-services"]],
      update: (row, { id, is_active }) => patchWhere("appointment_services_id", id, { is_active })(row),
      onSuccess: (_, { is_active }) =>
        toast.success(is_active ? "Sub-service restored" : "Sub-service deleted"),
      onError: (error) => toast.error("Could not update sub-service", { description: error.message }),
    }),
  });

  const isGroomingTab = categoryId === GROOMING_CATEGORY_ID;
  // Tiers are per grooming sub-service; each card manages its own.
  const [openTiersId, setOpenTiersId] = useState(null);
  const [tierService, setTierService] = useState(null); // whose tier is being added/edited
  const tiersQuery = useQuery({
    queryKey: ["maintenance-grooming-tiers"],
    queryFn: ({ signal }) => fetchMaintenanceGroomingTiers({ signal }),
    enabled: isGroomingTab,
    staleTime: 1000 * 60 * 5,
  });

  const deleteTierMutation = useMutation({
    mutationFn: deleteMaintenanceGroomingTier,
    ...optimisticMutation({
      keys: [["maintenance-grooming-tiers"]],
      refresh: [["maintenance-services"], ["appointment-services"], ["portal-appointment-services"]],
      update: (row, id) => removeWhere("tier_id", id)(row),
      onMutate: () => setConfirmDeleteTier(null),
      onSuccess: () => toast.success("Grooming tier deleted"),
      onError: (error) => toast.error("Could not delete grooming tier", { description: error.message }),
    }),
  });

  const isPending = categoriesQuery.isPending || servicesQuery.isPending;
  const isError = categoriesQuery.isError || servicesQuery.isError;

  const tiersFor = (serviceId) =>
    (tiersQuery.data ?? [])
      .filter((t) => t.appointment_services_id === serviceId)
      .sort((a, b) => (a.max_weight_kg ?? Infinity) - (b.max_weight_kg ?? Infinity));
  const statusFilter = serviceFilters.is_active ?? "";

  return (
    <div className="w-full space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Maintenance
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Sub-services, prices and weight tiers. Duration sets the appointment end time.
          </p>
        </div>
        <Button
          onClick={() => setEditingService({})}
          aria-label="Add sub-service"
          className="shrink-0 max-sm:size-11 max-sm:px-0"
        >
          <Plus size={18} />
          <span className="max-sm:hidden">Add sub-service</span>
        </Button>
      </div>

      <QueryState
        isLoading={isPending}
        isError={isError}
        error={categoriesQuery.error ?? servicesQuery.error}
        loadingLabel="Loading services..."
        errorLabel="Error loading services"
      />

      {!isPending && !isError && (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div
              role="tablist"
              aria-label="Service category"
              className="grid gap-1 p-1 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 md:w-md"
              style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
            >
              {categories.map((c) => {
                const on = c.category_id === categoryId;
                return (
                  <button
                    key={c.category_id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActiveCategoryId(c.category_id)}
                    className={`min-h-10 rounded-[10px] text-[13px] font-bold transition-colors cursor-pointer ${
                      on
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    {c.category_name}
                  </button>
                );
              })}
            </div>
            <label className="relative flex-1 md:max-w-xs">
              <span className="sr-only">Search sub-services</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500" />
              <input
                type="search"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search sub-services"
                className="w-full min-h-11 md:min-h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {services.length} {services.length === 1 ? "sub-service" : "sub-services"}
              {activeCategory ? ` · ${activeCategory.category_name}` : ""}
            </p>
            <div role="group" aria-label="Status" className="flex gap-1.5">
              {[["", "All"], ["true", "Active"], ["false", "Deleted"]].map(([value, label]) => {
                const on = statusFilter === value;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setServiceFilters(value ? { is_active: value } : {})}
                    className={`min-h-8 px-3 rounded-full border text-xs font-bold cursor-pointer transition-colors ${
                      on
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:border-slate-100"
                        : "bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {serviceSearch || statusFilter ? "No sub-services match." : "No sub-services in this category yet."}
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 items-start">
              {services.map((s) => (
                <ServiceCard
                  key={s.appointment_services_id}
                  service={s}
                  showTiers={isGroomingTab}
                  tiers={tiersFor(s.appointment_services_id)}
                  tiersLoading={isGroomingTab && tiersQuery.isPending}
                  tiersLoaded={tiersQuery.isSuccess}
                  tiersOpen={openTiersId === s.appointment_services_id}
                  onToggleTiers={() =>
                    setOpenTiersId((id) => (id === s.appointment_services_id ? null : s.appointment_services_id))
                  }
                  onAddTier={() => {
                    setTierService(s);
                    setEditingTier({});
                  }}
                  onEditTier={(tier) => {
                    setTierService(s);
                    setEditingTier(tier);
                  }}
                  onDeleteTier={(tier) => setConfirmDeleteTier(tier)}
                  onEdit={() => setEditingService(s)}
                  onToggleActive={() =>
                    toggleActiveMutation.mutate({
                      id: s.appointment_services_id,
                      is_active: !s.is_active,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}

      {editingTier !== null && tierService && (
        <GroomingTierModal
          tier={Object.keys(editingTier).length ? editingTier : null}
          service={tierService}
          onClose={() => setEditingTier(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDeleteTier)}
        onOpenChange={(open) => !open && setConfirmDeleteTier(null)}
        title="Delete grooming tier?"
        description={`Delete the "${confirmDeleteTier?.tier_name}" tier? Existing bookings keep their price.`}
        confirmLabel="Delete"
        isConfirming={deleteTierMutation.isPending}
        onConfirm={() => deleteTierMutation.mutate(confirmDeleteTier.tier_id)}
      />

      {editingService !== null && (
        <ServiceModal
          service={Object.keys(editingService).length ? editingService : null}
          categories={categories}
          defaultCategoryId={categoryId}
          onClose={() => setEditingService(null)}
        />
      )}
    </div>
  );
}
