import React, { useEffect, useState } from "react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router-dom";
import { fetchClientRecords } from "@/api/http";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ClientRecordsColumns } from "@/utils/COLUMNS";
import { Loader2 } from "lucide-react";

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
    queryKey: ["clients", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchClientRecords({
        page,
        limit,
        search: debouncedSearch,
        filters,
        signal,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  return (
    <div className="w-full space-y-4">
      {isPending ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-xl shadow-xs">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-2" />
          <span className="text-xs font-medium text-slate-500">
            Loading client records...
          </span>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-16 bg-red-50/50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
          <span>Error loading client records: {error.message}</span>
        </div>
      ) : (
        <>
          <DynamicGrid
            data={data?.rows ?? []}
            columnsConfig={ClientRecordsColumns}
            title="Client Records"
            buttonText="Add Client"
            buttonLink={`add-client${location.search}`}
            onEdit={(row) =>
              navigate(`edit-client/${row.client_id}${location.search}`)
            }
            onDelete={(row) =>
              navigate(`delete-client/${row.client_id}${location.search}`)
            }
            onPet={(row) => navigate(`/client-pet-record/${row.client_id}`)}
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
      <Outlet />
    </div>
  );
}
