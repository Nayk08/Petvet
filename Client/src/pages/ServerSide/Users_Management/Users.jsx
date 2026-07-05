import { usersColumns, usersActions } from "../../../utils/COLUMNS.jsx";
import DynamicGrid from "../../../components/ui/DynamicGrid";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "../../../api/http.js";

export default function Users() {
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
        actions={usersActions}
        title="Users Management"
      />
    </>
  );
}
