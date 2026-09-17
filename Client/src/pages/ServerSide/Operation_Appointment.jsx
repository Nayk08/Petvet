import { useEffect, useMemo, useState } from "react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { useQuery } from "@tanstack/react-query";
import {
  fetchOperationAppointments,
  selectAppointmentStaff,
  fetchCurrentUser,
} from "@/api/http";
import { AppointmentColumns } from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import QueryState from "@/components/ui/QueryState";

// Read-only: booking and status changes happen from the general
// Appointments page (gated under APPOINTMENT, not O_APPOINTMENT).
const READ_ONLY_COLUMNS = AppointmentColumns.filter(
  (col) => col.key !== "service_name",
);

export default function Operation_Appointment() {
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

  const { data: staff } = useQuery({
    queryKey: ["appointment-staff"],
    queryFn: ({ signal }) => selectAppointmentStaff({ signal }),
  });

  // Non-admins only ever see their own appointments here (enforced
  // server-side, overriding this filter regardless of what's sent) — so
  // the Staff filter would be misleading for them and is hidden instead.
  const { data: currentUserData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: ({ signal }) => fetchCurrentUser({ signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
  const isAdmin = currentUserData?.user?.role?.trim() === "Admin";

  const columnsConfig = useMemo(() => {
    const staffFilterOptions = (staff ?? []).map((s) => ({
      key: s.users_id,
      value: String(s.users_id),
      label: `${s.user_name} (${s.user_level?.trim()})`,
    }));
    return [
      ...READ_ONLY_COLUMNS,
      ...(isAdmin
        ? [
            {
              key: "assigned_staff_id",
              label: "Staff",
              filterOnly: true,
              multiSelect: true,
              filterOptions: staffFilterOptions,
            },
          ]
        : []),
      {
        key: "appointment_date",
        label: "Date",
        filterOnly: true,
        filterType: "date",
      },
    ];
  }, [staff, isAdmin]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "operation-appointments",
      page,
      limit,
      debouncedSearch,
      filters,
    ],
    queryFn: ({ signal }) =>
      fetchOperationAppointments({
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
    <div className="w-full space-y-4 py-6">
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        loadingLabel="Loading operation appointments..."
        errorLabel="Error loading operation appointments"
      />
      {!isLoading && !isError && (
        <>
          <DynamicGrid
            data={data?.rows ?? []}
            columnsConfig={columnsConfig}
            title="Operation Appointments"
            limit={limit}
            search={search}
            onSearchChange={setSearch}
            onLimitChange={setLimit}
            filters={filters}
            onFiltersChange={setFilters}
          />
          <Pagination
            page={page}
            totalPages={
              limit === "all" ? 1 : (data?.pagination?.totalPages ?? 1)
            }
            onPageChange={setPage}
            disabled={isLoading}
            total={data?.pagination?.total}
            limit={limit === "all" ? data?.pagination?.total : limit}
          />
        </>
      )}
    </div>
  );
}