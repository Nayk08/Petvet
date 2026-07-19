import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import DynamicGrid from "../../../components/ui/DynamicGrid";
import { InventoryColumns } from "@/utils/COLUMNS";
import { useQuery } from "@tanstack/react-query";
import { fetchInventory } from "@/api/http";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function Inventory() {
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

  const { data, isPending, isError, error, isPlaceholderData } = useQuery({
    queryKey: ["inventory", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchInventory({ page, limit, search: debouncedSearch, filters, signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  return (
    <>
      {isPending ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
          Loading inventory...
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-20 text-rose-400 text-sm">
          Error: {error.message}
        </div>
      ) : (
        <>
          <DynamicGrid
            data={data?.rows ?? []}
            columnsConfig={InventoryColumns}
            title="Inventory"
            buttonText="Add Products"
            buttonLink="add-product"
            onEdit={(row) => navigate(`edit-product/${row.product_id}`)}
            onDelete={(row) => navigate(`delete-product/${row.product_id}`)}
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
            disabled={isPending || isPlaceholderData}
            total={data?.pagination?.total}
            limit={limit === "all" ? data?.pagination?.total : limit}
          />
        </>
      )}
      <Outlet />
    </>
  );
}
