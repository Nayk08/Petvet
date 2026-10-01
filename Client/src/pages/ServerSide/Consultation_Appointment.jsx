import { useEffect, useMemo, useState } from "react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import {
  fetchConsultationAppointments,
  selectAppointmentStaff,
  fetchCurrentUser,
  completeAppointment,
  invalidateAppointmentQueries,
} from "@/api/http";
import { AppointmentColumns } from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import QueryState from "@/components/ui/QueryState";

// Booking/rescheduling still only happens from the general Appointments
// page (gated under APPOINTMENT, not C_APPOINTMENT) — but the assigned
// veterinarian DOES get one action here: marking their own in-queue
// appointment done once the visit is finished.
const READ_ONLY_COLUMNS = AppointmentColumns.filter(
  (col) => col.key !== "service_name",
);

export default function Consultation_Appointment() {
  const queryClient = useQueryClient();
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
      "consultation-appointments",
      page,
      limit,
      debouncedSearch,
      filters,
    ],
    queryFn: ({ signal }) =>
      fetchConsultationAppointments({
        page,
        limit,
        search: debouncedSearch,
        filters,
        signal,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const completeMutation = useMutation({
    mutationFn: completeAppointment,
    onSuccess: () => {
      toast.success("Appointment marked completed");
      invalidateAppointmentQueries();
      queryClient.invalidateQueries({ queryKey: ["TodayQueue"] });
    },
    onError: (error) => {
      toast.error("Could not complete appointment", {
        description: error.message,
      });
    },
  });

  return (
    <div className="w-full space-y-4 py-6">
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        loadingLabel="Loading consultation appointments..."
        errorLabel="Error loading consultation appointments"
      />
      {!isLoading && !isError && (
        <>
          <DynamicGrid
            data={data?.rows ?? []}
            columnsConfig={columnsConfig}
            title="Consultation Appointments"
            actions={[
              {
                label: "Mark Completed",
                icon: CheckCircle2,
                className:
                  "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
                onClick: (row) => completeMutation.mutate(row.appointment_id),
                show: (row) => row.appointment_status_name === "In Queue",
                isLoading: (row) =>
                  completeMutation.isPending &&
                  completeMutation.variables === row.appointment_id,
              },
            ]}
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
