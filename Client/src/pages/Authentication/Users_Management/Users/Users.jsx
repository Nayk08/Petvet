import { useEffect, useState, useMemo } from "react";
import { usersColumns, ArchivedUsersColumns } from "../../../../utils/COLUMNS.jsx";
import DynamicGrid from "../../../../components/ui/DynamicGrid.jsx";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchUsers,
  getCategoryUserLevel,
  fetchArchivedUsers,
  restoreUser,
  permanentlyDeleteUser,
  queryClient,
} from "../../../../api/http.js";
import { Outlet, useNavigate } from "react-router-dom";
import { usePagination } from "@/hooks/usePagination.jsx";
import { Pagination } from "@/components/ui/Pagination.jsx";
import { useDebouncedValue } from "@/hooks/useDebouncedValue.jsx";
import QueryState from "@/components/ui/QueryState.jsx";
import ModuleTabs from "@/components/ui/ModuleTabs.jsx";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog.jsx";
import { optimisticMutation, removeWhere } from "@/api/optimistic.js";

export function Component() {
  const navigate = useNavigate();

  const { page, limit, setPage, setLimit } = usePagination({
    defaultLimit: 10,
  });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const debouncedSearch = useDebouncedValue(search, 400);

  // Archive tab — soft-deleted users, viewed/paginated independently of the
  // active list below.
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

  const { data: CategoryUserLevel } = useQuery({
    queryKey: ["categoryUserlevel"],
    queryFn: ({ signal }) => getCategoryUserLevel({ signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Build the actual columnsConfig by merging live role options
  // into the static usersColumns definition. Filter values use the
  // role NAME (not ID), since UsersModel filters user_level as varchar.
  const mergedColumns = useMemo(() => {
    const roleOptions =
      CategoryUserLevel?.map((role) => ({
        key: role.user_level_id,
        value: role.user_level,
        label: role.user_level,
      })) ?? [];

    return usersColumns.map((col) =>
      col.key === "user_level"
        ? { ...col, multiSelect: true, filterOptions: roleOptions }
        : col.key === "is_active"
          ? {
              ...col,
              multiSelect: true,
              filterOptions: [
                { key: "active", value: "true", label: "Active" },
                { key: "inactive", value: "false", label: "Inactive" },
              ],
            }
          : col,
    );
  }, [CategoryUserLevel]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["usersdata", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchUsers({ page, limit, search: debouncedSearch, filters, signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const {
    data: archivedData,
    isPending: isArchivedPending,
    isError: isArchivedError,
    error: archivedError,
  } = useQuery({
    queryKey: ["users-archived", archivedPage, debouncedArchivedSearch],
    queryFn: ({ signal }) =>
      fetchArchivedUsers({
        page: archivedPage,
        limit: 10,
        search: debouncedArchivedSearch,
        signal,
      }),
    enabled: view === "archived",
    staleTime: 1000 * 30,
  });

  // Optimistic: the row leaves the Archived list at once (undone on failure).
  const restoreMutation = useMutation({
    mutationFn: restoreUser,
    ...optimisticMutation({
      keys: [["users-archived"]],
      refresh: [["usersdata"]],
      update: (row, id) => removeWhere("users_id", id)(row),
      onSuccess: () => toast.success("User restored"),
      onError: (error) => toast.error("Could not restore user", { description: error.message }),
    }),
  });

  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteUser,
    ...optimisticMutation({
      keys: [["users-archived"]],
      update: (row, id) => removeWhere("users_id", id)(row),
      onMutate: () => setConfirmDeleteUser(null),
      onSuccess: () => toast.success("User permanently deleted"),
      onError: (error) =>
        toast.error("Could not permanently delete user", { description: error.message }),
    }),
  });

  return (
    <>
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
            loadingLabel="Loading users..."
            errorLabel="Error loading users"
          />
          {!isPending && !isError && (
            <>
              <DynamicGrid
                data={data?.rows ?? []}
                columnsConfig={mergedColumns}
                title="Users Management"
                buttonText="Add User"
                buttonLink="add-user"
                onEdit={(row) => navigate(`edit-user/${row.users_id}`)}
                onDelete={(row) => navigate(`delete-user/${row.users_id}`)}
                limit={limit}
                onLimitChange={setLimit}
                rowKey="users_id"
                search={search}
                onSearchChange={setSearch}
                filters={filters}
                onFiltersChange={setFilters}
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
            loadingLabel="Loading archived users..."
            errorLabel="Error loading archived users"
          />
          {!isArchivedPending && !isArchivedError && (
            <>
              <DynamicGrid
                data={archivedData?.rows ?? []}
                columnsConfig={ArchivedUsersColumns}
                title="Archived Users"
                rowKey="users_id"
                actions={[
                  {
                    label: "Restore",
                    icon: RotateCcw,
                    className:
                      "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
                    onClick: (row) => {
                      if (!row.users_id) {
                        toast.error("Could not restore user", {
                          description: "This row is missing a user ID.",
                        });
                        return;
                      }
                      restoreMutation.mutate(row.users_id);
                    },
                    isLoading: (row) =>
                      restoreMutation.isPending &&
                      restoreMutation.variables === row.users_id,
                  },
                  {
                    label: "Delete Permanently",
                    icon: Trash2,
                    className:
                      "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-rose-400 dark:hover:bg-rose-950/50",
                    onClick: (row) => setConfirmDeleteUser(row),
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
        open={Boolean(confirmDeleteUser)}
        onOpenChange={(open) => !open && setConfirmDeleteUser(null)}
        title="Permanently delete user?"
        description={
          <>
            This will permanently delete{" "}
            <span className="text-slate-900 dark:text-slate-200 font-semibold">
              {confirmDeleteUser?.user_name}
            </span>
            . This can't be undone — it will fail instead if this user still
            has appointment history.
          </>
        }
        confirmLabel="Delete Permanently"
        isConfirming={permanentDeleteMutation.isPending}
        onConfirm={() =>
          permanentDeleteMutation.mutate(confirmDeleteUser.users_id)
        }
      />
    </>
  );
}

export function loader() {
  return queryClient.fetchQuery({
    queryKey: ["usersdata", 1, 10, "", {}],
    queryFn: ({ signal }) =>
      fetchUsers({ page: 1, limit: 10, search: "", filters: {}, signal }),
  });
}
