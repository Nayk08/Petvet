import {
  usersLevelColumns,
  usersLevelActions,
} from "../../../utils/COLUMNS.jsx";
import DynamicGrid from "../../../components/ui/DynamicGrid";
import { useQuery } from "@tanstack/react-query";
import { fetchUserLevel } from "../../../api/http.js";

export default function Roles() {
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
    <DynamicGrid
      data={data ?? []}
      columnsConfig={usersLevelColumns}
      actions={usersLevelActions}
      title="Roles Management"
    />
  );
}
