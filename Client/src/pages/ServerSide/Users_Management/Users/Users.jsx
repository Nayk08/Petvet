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

  // 🔽 NEW: build the actual columnsConfig by merging live role options
  // into the static usersColumns definition
  const mergedColumns = useMemo(() => {
    const roleOptions =
      CategoryUserLevel?.map((role) => ({
        key: role.user_level_id,
        value: role.user_level_id,
        label: role.user_level,
      })) ?? [];

    return usersColumns.map((col) =>
      col.key === "user_level"
        ? { ...col, filterOptions: roleOptions }
        : col.key === "is_active"
          ? {
              ...col,
              filterOptions: [
                { key: "active", value: "true", label: "Active" },
                { key: "inactive", value: "false", label: "Inactive" },
              ],
            }
          : col,
    );
  }, [CategoryUserLevel]);

  const { data, isPending, isError, error, isPlaceholderData } = useQuery({
    queryKey: ["usersdata", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchUsers({ page, limit, search: debouncedSearch, filters, signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  if (isPending)
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        Loading users...
      </div>
    );

  if (isError)
    return (
      <div className="flex items-center justify-center py-20 text-rose-400 text-sm">
        Error: {error.message}
      </div>
    );

  {
    console.log("CategoryUserLevel raw response:", CategoryUserLevel);
  }

  return (
    <>
      <DynamicGrid
        data={data?.data ?? []}
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
        disabled={isPending || isPlaceholderData}
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
