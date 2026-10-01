import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import DynamicGrid from "../../../components/ui/DynamicGrid";
import { getInventoryColumns, getArchivedInventoryColumns } from "@/utils/COLUMNS";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInventory,
  fetchProductCategories,
  fetchArchivedProducts,
  restoreProduct,
  permanentlyDeleteProduct,
} from "@/api/http";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import QueryState from "@/components/ui/QueryState";
import BatchesModal from "./components/BatchesModal.jsx";
import { Layers, PackagePlus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ModuleTabs from "@/components/ui/ModuleTabs";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

import Container from "@/components/ui/Container";

export default function Inventory() {
  const SALES_REVENUE = 8000;
  const SERVICES_REVENUE = 4450;
  const TOTAL_REVENUE = SALES_REVENUE + SERVICES_REVENUE;
  const navigate = useNavigate();
  const { page, limit, setPage, setLimit } = usePagination({
    defaultLimit: 10,
  });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const debouncedSearch = useDebouncedValue(search, 400);
  const [batchesFor, setBatchesFor] = useState(null);
  const queryClient = useQueryClient();

  // Archive tab — soft-deleted products, viewed/paginated independently of
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
    queryKey: ["inventory", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchInventory({
        page,
        limit,
        search: debouncedSearch,
        filters,
        grouped: true,
        signal,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: ({ signal }) => fetchProductCategories({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: archivedData,
    isPending: isArchivedPending,
    isError: isArchivedError,
    error: archivedError,
  } = useQuery({
    queryKey: ["inventory-archived", archivedPage, debouncedArchivedSearch],
    queryFn: ({ signal }) =>
      fetchArchivedProducts({
        page: archivedPage,
        limit: 10,
        search: debouncedArchivedSearch,
        signal,
      }),
    enabled: view === "archived",
    staleTime: 1000 * 30,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => {
      toast.success("Product restored");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryProducts"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-archived"] });
    },
    onError: (error) => {
      toast.error("Could not restore product", {
        description: error.message,
      });
    },
  });

  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(null);

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteProduct,
    onSuccess: () => {
      toast.success("Product permanently deleted");
      setConfirmDeleteProduct(null);
      queryClient.invalidateQueries({ queryKey: ["inventory-archived"] });
    },
    onError: (error) => {
      toast.error("Could not permanently delete product", {
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
            loadingLabel="Loading inventory records..."
            errorLabel="Error loading inventory"
          />
          {!isPending && !isError && (
            <>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <Container
                    title="Sales Revenue"
                    value={`₱ ${SALES_REVENUE.toLocaleString()}`}
                    trend="+12.5%"
                  />
                  <Container
                    title="Services Revenue"
                    value={`₱ ${SERVICES_REVENUE.toLocaleString()}`}
                    trend="+8.2%"
                  />
                  <Container title="Today's Queue" value="5" trend="+2" />
                  <Container title="Today's Queue" value="5" trend="+2" />
                </div>
              </div>
              <DynamicGrid
                data={data?.rows ?? []}
                columnsConfig={getInventoryColumns(categories)}
                title="Inventory"
                buttonText="Add Products"
                buttonLink="add-product"
                onEdit={(row) => navigate(`edit-product/${row.product_id}`)}
                onDelete={(row) => navigate(`delete-product/${row.product_id}`)}
                // A grouped row (same product name, different batch) has no
                // single product_id to edit/delete directly — send those
                // through the batches modal instead, where each batch is its
                // own row with its own edit/delete.
                canEdit={(row) => row.batch_count === 1}
                canDelete={(row) => row.batch_count === 1}
                actions={[
                  {
                    label: "Add Quantity",
                    icon: PackagePlus,
                    className:
                      "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50",
                    onClick: (row) => navigate(`add-quantity/${row.product_id}`),
                    // Only unambiguous for a single batch — for a grouped row,
                    // restock a specific batch from inside the batches modal
                    // instead.
                    show: (row) => row.batch_count === 1,
                  },
                  {
                    label: "View Batches",
                    icon: Layers,
                    className:
                      "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
                    onClick: (row) => setBatchesFor(row.product_name),
                    show: (row) => row.batch_count > 1,
                  },
                ]}
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
          {batchesFor && (
            <BatchesModal
              productName={batchesFor}
              onClose={() => setBatchesFor(null)}
            />
          )}
          <Outlet />
        </>
      ) : (
        <>
          <QueryState
            isLoading={isArchivedPending}
            isError={isArchivedError}
            error={archivedError}
            loadingLabel="Loading archived products..."
            errorLabel="Error loading archived products"
          />
          {!isArchivedPending && !isArchivedError && (
            <>
              <DynamicGrid
                data={archivedData?.rows ?? []}
                columnsConfig={getArchivedInventoryColumns(categories)}
                title="Archived Products"
                actions={[
                  {
                    label: "Restore",
                    icon: RotateCcw,
                    className:
                      "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
                    onClick: (row) => {
                      if (!row.product_id) {
                        toast.error("Could not restore product", {
                          description: "This row is missing a product ID.",
                        });
                        return;
                      }
                      restoreMutation.mutate(row.product_id);
                    },
                    isLoading: (row) =>
                      restoreMutation.isPending &&
                      restoreMutation.variables === row.product_id,
                  },
                  {
                    label: "Delete Permanently",
                    icon: Trash2,
                    className:
                      "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-rose-400 dark:hover:bg-rose-950/50",
                    onClick: (row) => setConfirmDeleteProduct(row),
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
        open={Boolean(confirmDeleteProduct)}
        onOpenChange={(open) => !open && setConfirmDeleteProduct(null)}
        title="Permanently delete product?"
        description={
          <>
            This will permanently delete{" "}
            <span className="text-slate-900 dark:text-slate-200 font-semibold">
              {confirmDeleteProduct?.product_name}
            </span>
            . This can't be undone — it will fail instead if this product
            still has sales history.
          </>
        }
        confirmLabel="Delete Permanently"
        isConfirming={permanentDeleteMutation.isPending}
        onConfirm={() =>
          permanentDeleteMutation.mutate(confirmDeleteProduct.product_id)
        }
      />
    </div>
  );
}
