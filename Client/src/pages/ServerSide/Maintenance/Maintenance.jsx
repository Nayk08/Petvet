import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Power, PowerOff } from "lucide-react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import ModuleTabs from "@/components/ui/ModuleTabs";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button.jsx";
import QueryState from "@/components/ui/QueryState";
import {
  MaintenanceServiceColumns,
  MaintenanceGroomingTierColumns,
} from "@/utils/COLUMNS";
import {
  fetchMaintenanceServices,
  fetchMaintenanceGroomingTiers,
  setMaintenanceServiceActive,
  deleteMaintenanceGroomingTier,
} from "@/api/http.js";
import ServiceModal from "./components/ServiceModal.jsx";
import GroomingTierModal from "./components/GroomingTierModal.jsx";

export function Component() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("services");

  const [editingService, setEditingService] = useState(null); // {} = add, row = edit
  const [editingTier, setEditingTier] = useState(null);
  const [confirmDeleteTier, setConfirmDeleteTier] = useState(null);

  const {
    data: services = [],
    isPending: isServicesPending,
    isError: isServicesError,
    error: servicesError,
  } = useQuery({
    queryKey: ["maintenance-services"],
    queryFn: ({ signal }) => fetchMaintenanceServices({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: tiers = [],
    isPending: isTiersPending,
    isError: isTiersError,
    error: tiersError,
  } = useQuery({
    queryKey: ["maintenance-grooming-tiers"],
    queryFn: ({ signal }) => fetchMaintenanceGroomingTiers({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => setMaintenanceServiceActive(id, is_active),
    onSuccess: () => {
      toast.success("Service status updated");
      queryClient.invalidateQueries({ queryKey: ["maintenance-services"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-services"] });
      queryClient.invalidateQueries({ queryKey: ["portal-appointment-services"] });
    },
    onError: (error) => {
      toast.error("Could not update service status", { description: error.message });
    },
  });

  const deleteTierMutation = useMutation({
    mutationFn: deleteMaintenanceGroomingTier,
    onSuccess: () => {
      toast.success("Grooming tier deleted");
      setConfirmDeleteTier(null);
      queryClient.invalidateQueries({ queryKey: ["maintenance-grooming-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["grooming-price-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["portal-grooming-price-tiers"] });
    },
    onError: (error) => {
      toast.error("Could not delete grooming tier", { description: error.message });
    },
  });

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Maintenance
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage the appointment service catalog and grooming pricing tiers.
        </p>
      </div>

      <ModuleTabs
        tabs={[
          { value: "services", label: "Services" },
          { value: "tiers", label: "Grooming Tiers" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "services" ? (
        <>
          <QueryState
            isLoading={isServicesPending}
            isError={isServicesError}
            error={servicesError}
            loadingLabel="Loading services..."
            errorLabel="Error loading services"
          />
          {!isServicesPending && !isServicesError && (
            <DynamicGrid
              data={services}
              columnsConfig={MaintenanceServiceColumns}
              title="Services"
              extraActions={
                <Button
                  onClick={() => setEditingService({})}
                  className="flex items-center gap-1.5 font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Plus size={16} />
                  Add Service
                </Button>
              }
              onEdit={(row) => setEditingService(row)}
              actions={[
                {
                  label: (row) => (row?.is_active ? "Deactivate" : "Activate"),
                  icon: (row) => (row?.is_active ? PowerOff : Power),
                  className: (row) =>
                    row?.is_active
                      ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50"
                      : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
                  onClick: (row) =>
                    toggleActiveMutation.mutate({
                      id: row.appointment_services_id,
                      is_active: !row.is_active,
                    }),
                  isLoading: (row) =>
                    toggleActiveMutation.isPending &&
                    toggleActiveMutation.variables?.id === row.appointment_services_id,
                },
              ]}
            />
          )}
        </>
      ) : (
        <>
          <QueryState
            isLoading={isTiersPending}
            isError={isTiersError}
            error={tiersError}
            loadingLabel="Loading grooming tiers..."
            errorLabel="Error loading grooming tiers"
          />
          {!isTiersPending && !isTiersError && (
            <DynamicGrid
              data={tiers}
              columnsConfig={MaintenanceGroomingTierColumns}
              title="Grooming Tiers"
              extraActions={
                <Button
                  onClick={() => setEditingTier({})}
                  className="flex items-center gap-1.5 font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Plus size={16} />
                  Add Tier
                </Button>
              }
              onEdit={(row) => setEditingTier(row)}
              onDelete={(row) => setConfirmDeleteTier(row)}
            />
          )}
        </>
      )}

      {editingService !== null && (
        <ServiceModal
          service={
            Object.keys(editingService).length ? editingService : null
          }
          onClose={() => setEditingService(null)}
        />
      )}

      {editingTier !== null && (
        <GroomingTierModal
          tier={Object.keys(editingTier).length ? editingTier : null}
          onClose={() => setEditingTier(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDeleteTier)}
        onOpenChange={(open) => !open && setConfirmDeleteTier(null)}
        title="Delete grooming tier?"
        description={
          <>
            This will permanently delete the{" "}
            <span className="text-slate-900 dark:text-slate-200 font-semibold">
              {confirmDeleteTier?.tier_name}
            </span>{" "}
            tier. This can't be undone.
          </>
        }
        confirmLabel="Delete"
        isConfirming={deleteTierMutation.isPending}
        onConfirm={() => deleteTierMutation.mutate(confirmDeleteTier.tier_id)}
      />
    </div>
  );
}
