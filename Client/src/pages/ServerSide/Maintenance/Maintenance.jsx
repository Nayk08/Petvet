import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import ModuleTabs from "@/components/ui/ModuleTabs";
import { Button } from "@/components/ui/button.jsx";
import QueryState from "@/components/ui/QueryState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { optimisticMutation, removeWhere, patchWhere } from "@/api/optimistic.js";
import { MaintenanceServiceColumns, MaintenanceGroomingTierColumns } from "@/utils/COLUMNS";
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

// Three fixed categories (Grooming / Consultation / Operation) — one tab
// each, listing only that category's sub-services. Categories themselves
// can't be added, renamed or deleted; sub-services can.
export function Component() {
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [editingService, setEditingService] = useState(null); // {} = add, row = edit
  const [editingTier, setEditingTier] = useState(null); // {} = add, row = edit
  const [confirmDeleteTier, setConfirmDeleteTier] = useState(null);

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
  const services = (servicesQuery.data ?? []).filter(
    (s) => s.category_id === categoryId,
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
  // Tiers are per grooming sub-service: pick which one's tiers to manage.
  const groomingServices = (servicesQuery.data ?? []).filter(
    (s) => s.category_id === GROOMING_CATEGORY_ID && s.is_active,
  );
  const [tierServiceId, setTierServiceId] = useState(null);
  const tierService =
    groomingServices.find((s) => s.appointment_services_id === tierServiceId) ??
    groomingServices[0];
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

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Maintenance
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage the sub-services offered under each service category.
        </p>
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
          <ModuleTabs
            tabs={categories.map((c) => ({
              value: c.category_id,
              label: c.category_name,
            }))}
            active={categoryId}
            onChange={setActiveCategoryId}
          />

          <DynamicGrid
            data={services}
            columnsConfig={MaintenanceServiceColumns}
            title={`${activeCategory?.category_name ?? ""} Sub-services`}
            subtitle={`Sub-services offered under ${activeCategory?.category_name ?? "this category"}. Each one's duration sets the appointment end time.`}
            extraActions={
              <Button
                onClick={() => setEditingService({})}
                className="flex items-center gap-1.5 font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Plus size={16} />
                Add Sub-service
              </Button>
            }
            onEdit={(row) => setEditingService(row)}
            actions={[
              {
                label: (row) => (row?.is_active ? "Delete" : "Restore"),
                icon: (row) => (row?.is_active ? Trash2 : RotateCcw),
                className: (row) =>
                  row?.is_active
                    ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
                onClick: (row) =>
                  toggleActiveMutation.mutate({
                    id: row.appointment_services_id,
                    is_active: !row.is_active,
                  }),
              },
            ]}
          />

          {isGroomingTab && (
            <>
              <QueryState
                isLoading={tiersQuery.isPending}
                isError={tiersQuery.isError}
                error={tiersQuery.error}
                loadingLabel="Loading grooming tiers..."
                errorLabel="Error loading grooming tiers"
              />
              {tiersQuery.isSuccess && tierService && (
                <DynamicGrid
                  data={tiersQuery.data.filter(
                    (t) => t.appointment_services_id === tierService.appointment_services_id,
                  )}
                  columnsConfig={MaintenanceGroomingTierColumns}
                  title={`Weight Tiers — ${tierService.appointment_services}`}
                  subtitle="Each grooming sub-service has its own weight tiers: the smallest tier that covers the pet's weight applies. With no tiers, the sub-service's flat price is charged. A pet with no weight, or heavier than every tier, is priced by staff at payment."
                  extraActions={
                    <div className="flex items-center gap-2">
                      {/* Which grooming sub-service's tiers to show / add to. */}
                      <select
                        aria-label="Tiers for sub-service"
                        value={tierService.appointment_services_id}
                        onChange={(e) => setTierServiceId(Number(e.target.value))}
                        className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm text-slate-900 dark:text-slate-100"
                      >
                        {groomingServices.map((s) => (
                          <option key={s.appointment_services_id} value={s.appointment_services_id}>
                            {s.appointment_services}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={() => setEditingTier({})}
                        className="flex items-center gap-1.5 font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        <Plus size={16} />
                        Add Tier
                      </Button>
                    </div>
                  }
                  onEdit={(row) => setEditingTier(row)}
                  actions={[
                    {
                      label: "Delete",
                      icon: Trash2,
                      className:
                        "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50",
                      onClick: (row) => setConfirmDeleteTier(row),
                    },
                  ]}
                />
              )}
            </>
          )}
        </>
      )}

      {editingTier !== null && (
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
