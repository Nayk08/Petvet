import { useEffect, useState, useMemo } from "react";
import { usersColumns } from "../../../../utils/COLUMNS.jsx";
import DynamicGrid from "../../../../components/ui/DynamicGrid.jsx";
import { useQuery } from "@tanstack/react-query";
import {
  fetchUsers,
  getCategoryUserLevel,
  queryClient,
} from "../../../../api/http.js";
import { Outlet, useNavigate } from "react-router-dom";
import { usePagination } from "@/hooks/usePagination.jsx";
import { Pagination } from "@/components/ui/Pagination.jsx";
import { useDebouncedValue } from "@/hooks/useDebouncedValue.jsx";

export function Component() {
  const navigate = useNavigate();

  const { page, limit, setPage, setLimit } = usePagination({
    defaultLimit: 10,
  });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, JSON.stringify(filters)]);

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

  if (isPending)
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm font-medium">
        Loading users...
      </div>
    );

  if (isError)
    return (
      <div className="flex items-center justify-center py-20 text-destructive text-sm font-medium">
        Error: {error.message}
      </div>
    );

  return (
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
        totalPages={limit === "all" ? 1 : (data?.pagination?.totalPages ?? 1)}
        onPageChange={setPage}
        disabled={isPending}
        total={data?.pagination?.total}
        limit={limit === "all" ? data?.pagination?.total : limit}
      />
      <Outlet />
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
