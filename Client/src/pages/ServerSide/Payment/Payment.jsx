import DynamicGrid from "@/components/ui/DynamicGrid";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router-dom";
import { fetchPayments, queryClient } from "@/api/http";
import { PaymentColumns } from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import QueryState from "@/components/ui/QueryState";

export function Component() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const { page, limit, setPage, setLimit } = usePagination({
    defaultLimit: 10,
  });
  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, JSON.stringify(filters)]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["Payments", page, limit, debouncedSearch, filters],
    queryFn: ({ signal }) =>
      fetchPayments({ page, limit, search: debouncedSearch, filters, signal }),
  });

  return (
    <>
      <QueryState
        isLoading={isPending}
        isError={isError}
        error={error}
        loadingLabel="Loading payments..."
        errorLabel="Error loading payments"
      />
      {!isPending && !isError && (
        <>
          <DynamicGrid
            data={data?.rows ?? []}
            columnsConfig={PaymentColumns}
            title="Payment"
            onView={(row) => navigate(`view-payment/${row.payment_id}`)}
            onProcess={(row) =>
              navigate({
                pathname: `process-payment/${row.payment_id}`,
                search: window.location.search,
              })
            }
            onDelete={(row) =>
              navigate({
                pathname: `delete-payment/${row.payment_id}`,
                search: window.location.search,
              })
            }
            // Only show "Process" when the payment is still pending
            canProcess={(row) => row.payment_status_name === "Pending"}
            // Only show "View" when the payment is completed or cancelled
            canView={(row) =>
              row.payment_status_name === "Completed" ||
              row.payment_status_name === "Cancelled"
            }
            canDelete={(row) => row.payment_status_name === "Pending"}
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

          <Outlet />
        </>
      )}
    </>
  );
}
