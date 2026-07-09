import { usersColumns } from "../../../../utils/COLUMNS.jsx";
import DynamicGrid from "../../../../components/ui/DynamicGrid.jsx";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers, queryClient } from "../../../../api/http.js";
import { Outlet, useNavigate } from "react-router-dom";

export function Component() {
  const navigate = useNavigate();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["usersdata"],
    queryFn: ({ signal }) => fetchUsers({ signal }),
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  return (
    <>
      <DynamicGrid
        data={data ?? []}
        columnsConfig={usersColumns}
        title="Users Management"
        buttonText="Add User"
        buttonLink="add-user"
        onEdit={(row) => navigate(`edit-user/${row.users_id}`)}
        onDelete={(row) => navigate(`delete-user/${row.users_id}`)}
      />
      <Outlet />
    </>
  );
}

export function loader() {
  return queryClient.fetchQuery({
    queryKey: ["usersdata"],
    queryFn: ({ signal }) => fetchUsers({ signal }),
  });
}
