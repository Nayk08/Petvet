import React, { useEffect, useState } from "react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router-dom";
import {
  fetchClientRecords,
  fetchArchivedClients,
  restoreClient,
  permanentlyDeleteClient,
} from "@/api/http";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ClientRecordsColumns, ArchivedClientRecordsColumns } from "@/utils/COLUMNS";
import QueryState from "@/components/ui/QueryState";
import ModuleTabs from "@/components/ui/ModuleTabs";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export function Component() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { page, limit, setPage, setLimit } = usePagination({
    defaultLimit: 10,
  });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const debouncedSearch = useDebouncedValue(search, 400);

  // Archive tab — soft-deleted clients, viewed/paginated independently of
  // the active list above.
  const [view, setView] = useState("active");
  const [archivedPage, setArchivedPage] = useState(1);
  const [archivedSearch, setArchivedSearch] = useState("");
  const debouncedArchivedSearch = useDebouncedValue(archivedSearch, 400);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, JSON.stringify(filters)]);

  useEffect(() => {
    setArchivedPage(1);
  }, [debouncedArchivedSearch]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["clients", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchClientRecords({
        page,
        limit,
        search: debouncedSearch,
        filters,
        signal,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const {
    data: archivedData,
    isPending: isArchivedPending,
    isError: isArchivedError,
    error: archivedError,
  } = useQuery({
    queryKey: ["clients-archived", archivedPage, debouncedArchivedSearch],
    queryFn: ({ signal }) =>
      fetchArchivedClients({
        page: archivedPage,
        limit: 10,
        search: debouncedArchivedSearch,
        signal,
      }),
    enabled: view === "archived",
    staleTime: 1000 * 30,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreClient,
    onSuccess: () => {
      toast.success("Client restored");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients-archived"] });
    },
    onError: (error) => {
      toast.error("Could not restore client", { description: error.message });
    },
  });

  const [confirmDeleteClient, setConfirmDeleteClient] = useState(null);

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteClient,
    onSuccess: () => {
      toast.success("Client permanently deleted");
      setConfirmDeleteClient(null);
      queryClient.invalidateQueries({ queryKey: ["clients-archived"] });
    },
    onError: (error) => {
      toast.error("Could not permanently delete client", {
        description: error.message,
      });
    },
  });

  return (
    <div className="w-full space-y-4">
      <ModuleTabs
        tabs={[
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
        ]}
        active={view}
        onChange={setView}
      />

      {view === "active" ? (
        <>
          <QueryState
            isLoading={isPending}
            isError={isError}
            error={error}
            loadingLabel="Loading client records..."
            errorLabel="Error loading client records"
          />
          {!isPending && !isError && (
            <>
              <DynamicGrid
                data={data?.rows ?? []}
                columnsConfig={ClientRecordsColumns}
                title="Client Records"
                buttonText="Add Client"
                buttonLink={`add-client${location.search}`}
                onEdit={(row) =>
                  navigate(`edit-client/${row.client_id}${location.search}`)
                }
                onDelete={(row) =>
                  navigate(`delete-client/${row.client_id}${location.search}`)
                }
                onPet={(row) => navigate(`/client-pet-record/${row.client_id}`)}
                limit={limit}
                search={search}
                onSearchChange={setSearch}
                filters={filters}
                onFiltersChange={setFilters}
                onLimitChange={setLimit}
              />
              <Pagination
                page={page}
                totalPages={
                  limit === "all" ? 1 : (data?.pagination?.totalPages ?? 1)
                }
                onPageChange={setPage}
                disabled={isPending}
                total={data?.pagination?.total}
                limit={limit === "all" ? data?.pagination?.total : limit}
              />
            </>
          )}
          <Outlet />
        </>
      ) : (
        <>
          <QueryState
            isLoading={isArchivedPending}
            isError={isArchivedError}
            error={archivedError}
            loadingLabel="Loading archived clients..."
            errorLabel="Error loading archived clients"
          />
          {!isArchivedPending && !isArchivedError && (
            <>
              <DynamicGrid
                data={archivedData?.rows ?? []}
                columnsConfig={ArchivedClientRecordsColumns}
                title="Archived Clients"
                actions={[
                  {
                    label: "Restore",
                    icon: RotateCcw,
                    className:
                      "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
                    onClick: (row) => {
                      if (!row.client_id) {
                        toast.error("Could not restore client", {
                          description: "This row is missing a client ID.",
                        });
                        return;
                      }
                      restoreMutation.mutate(row.client_id);
                    },
                    isLoading: (row) =>
                      restoreMutation.isPending &&
                      restoreMutation.variables === row.client_id,
                  },
                  {
                    label: "Delete Permanently",
                    icon: Trash2,
                    className:
                      "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-rose-400 dark:hover:bg-rose-950/50",
                    onClick: (row) => setConfirmDeleteClient(row),
                  },
                ]}
                search={archivedSearch}
                onSearchChange={setArchivedSearch}
              />
              <Pagination
                page={archivedPage}
                totalPages={archivedData?.pagination?.totalPages ?? 1}
                onPageChange={setArchivedPage}
                disabled={isArchivedPending}
                total={archivedData?.pagination?.total}
                limit={10}
              />
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmDeleteClient)}
        onOpenChange={(open) => !open && setConfirmDeleteClient(null)}
        title="Permanently delete client?"
        description={
          <>
            This will permanently delete{" "}
            <span className="text-slate-900 dark:text-slate-200 font-semibold">
              {confirmDeleteClient?.name}
            </span>
            . This can't be undone — it will fail instead if this client
            still has pets or appointment history.
          </>
        }
        confirmLabel="Delete Permanently"
        isConfirming={permanentDeleteMutation.isPending}
        onConfirm={() =>
          permanentDeleteMutation.mutate(confirmDeleteClient.client_id)
        }
      />
    </div>
  );
}
