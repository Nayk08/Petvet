import { useEffect, useState } from "react";
import { usersLevelColumns } from "../../../../utils/COLUMNS.jsx";
import DynamicGrid from "../../../../components/ui/DynamicGrid.jsx";
import { useQuery } from "@tanstack/react-query";
import { fetchUserLevel, queryClient } from "../../../../api/http.js";
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

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["usersLeveldata", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchUserLevel({ page, limit, search: debouncedSearch, filters, signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // if (isPending) return (<p>Loadiing</p>;
  // if (isError) return (/* ... */);

  return (
    <>
      <DynamicGrid
        data={data?.data ?? []}
        columnsConfig={usersLevelColumns}
        title="Roles Management"
        buttonText="Add Role"
        buttonLink="add-role"
        onEdit={(row) => navigate(`edit-role/${row.user_level_id}`)}
        onDelete={(row) => navigate(`delete-role/${row.user_level_id}`)}
        rowKey="user_level_id"
        limit={limit}
        onLimitChange={setLimit}
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
      />
      <Outlet />
    </>
  );
}
