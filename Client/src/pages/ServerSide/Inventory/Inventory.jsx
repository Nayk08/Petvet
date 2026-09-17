import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import DynamicGrid from "../../../components/ui/DynamicGrid";
import { InventoryColumns } from "@/utils/COLUMNS";
import { useQuery } from "@tanstack/react-query";
import { fetchInventory } from "@/api/http";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import QueryState from "@/components/ui/QueryState";

import Container from "@/components/ui/Container";

export default function Inventory() {
  const SALES_REVENUE = 8000;
  const SERVICES_REVENUE = 4450;
  const TOTAL_REVENUE = SALES_REVENUE + SERVICES_REVENUE;
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
    queryKey: ["inventory", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchInventory({ page, limit, search: debouncedSearch, filters, signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  return (
    <div className="w-full space-y-4">
      <QueryState
        isLoading={isPending}
        isError={isError}
        error={error}
        loadingLabel="Loading inventory records..."
        errorLabel="Error loading inventory"
      />
      {!isPending && !isError && (
        <>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Container
                title="Sales Revenue"
                value={`₱ ${SALES_REVENUE.toLocaleString()}`}
                trend="+12.5%"
              />
              <Container
                title="Services Revenue"
                value={`₱ ${SERVICES_REVENUE.toLocaleString()}`}
                trend="+8.2%"
              />
              <Container title="Today's Queue" value="5" trend="+2" />
              <Container title="Today's Queue" value="5" trend="+2" />
            </div>
          </div>
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
