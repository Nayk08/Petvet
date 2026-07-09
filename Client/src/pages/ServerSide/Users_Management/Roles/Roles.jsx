import {
  usersLevelColumns,
  usersLevelActions,
} from "../../../../utils/COLUMNS.jsx";
import DynamicGrid from "../../../../components/ui/DynamicGrid.jsx";
import { useQuery } from "@tanstack/react-query";
import { fetchUserLevel } from "../../../../api/http.js";
import { Outlet, useNavigate } from "react-router-dom";
import { queryClient } from "../../../../api/http.js";

export function Component() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["usersLeveldata"],
    queryFn: ({ signal }) => fetchUserLevel({ signal }),
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
        columnsConfig={usersLevelColumns}
        title="Roles Management"
        buttonText="Add Role"
        buttonLink="add-role"
        onEdit={(row) => navigate(`edit-role/${row.user_level_id}`)}
        onDelete={(row) => navigate(`delete-role/${row.user_level_id}`)}
      />
      <Outlet />
    </>
  );
}

export function loader() {
  return queryClient.fetchQuery({
    queryKey: ["usersLeveldata"],
    queryFn: ({ signal }) => fetchUserLevel({ signal }),
  });
}
