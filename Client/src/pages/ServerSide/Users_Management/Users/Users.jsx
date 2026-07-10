import { usersColumns } from "../../../../utils/COLUMNS.jsx";
import DynamicGrid from "../../../../components/ui/DynamicGrid.jsx";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchUsers, queryClient } from "../../../../api/http.js";
import { Outlet, useNavigate } from "react-router-dom";
import { usePagination } from "@/hooks/usePagination.jsx";
import { Pagination } from "@/components/ui/Pagination.jsx";

export function Component() {
  const navigate = useNavigate();

  const { page, limit, setPage, setLimit } = usePagination({
    defaultLimit: 10,
  });

  const { data, isPending, isError, error, isPlaceholderData } = useQuery({
    queryKey: ["usersdata", page, limit],
    queryFn: ({ signal }) => fetchUsers({ page, limit, signal }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
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

  return (
    <>
      <DynamicGrid
        data={data?.data ?? []}
        columnsConfig={usersColumns}
        title="Users Management"
        buttonText="Add User"
        buttonLink="add-user"
        onEdit={(row) => navigate(`edit-user/${row.users_id}`)}
        onDelete={(row) => navigate(`delete-user/${row.users_id}`)}
        limit={limit}
        onLimitChange={setLimit}
        rowKey="users_id"
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
    queryKey: ["usersdata", 1, 10],
    queryFn: ({ signal }) => fetchUsers({ page: 1, limit: 10, signal }),
  });
}
