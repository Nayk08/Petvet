import { useEffect, useMemo, useState } from "react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Stethoscope } from "lucide-react";
import {
  selectAppointmentStaff,
  fetchCurrentUser,
  completeAppointment,
} from "@/api/http";
import { AppointmentColumns } from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import QueryState from "@/components/ui/QueryState";
import AddConsultationModal from "./AddConsultationModal.jsx";
import { optimisticMutation, patchWhere, APPOINTMENT_LIST_KEYS } from "@/api/optimistic.js";

// Shared page for the per-service appointment queues (Consultation,
// Grooming, Operation). Booking/rescheduling still only happens from the
// general Appointments page — the assigned staff member only gets "Mark
// Completed" here, plus "Add Medical Record" on the vet-facing queues.
const READ_ONLY_COLUMNS = AppointmentColumns.filter(
  (col) => col.key !== "category_name", // each page is one category already
);

export default function ServiceAppointments({ name, queryKey, fetchAppointments, allowMedicalRecord = false }) {
  const { page, limit, setPage, setLimit } = usePagination({
    defaultLimit: 10,
  });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const debouncedSearch = useDebouncedValue(search, 400);
  const [consultationAppointment, setConsultationAppointment] = useState(null);

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
      queryKey,
      page,
      limit,
      debouncedSearch,
      filters,
    ],
    queryFn: ({ signal }) =>
      fetchAppointments({
        page,
        limit,
        search: debouncedSearch,
        filters,
        signal,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Optimistic: shows Completed at once; undone if the server refuses (e.g.
  // a deposit's balance isn't collected yet — its message explains).
  const completeMutation = useMutation({
    mutationFn: completeAppointment,
    ...optimisticMutation({
      keys: APPOINTMENT_LIST_KEYS,
      update: (row, id) =>
        patchWhere("appointment_id", id, { appointment_status_name: "Completed" })(row),
      onSuccess: () => toast.success("Appointment marked completed"),
      onError: (error) =>
        toast.error("Could not complete appointment", { description: error.message }),
    }),
  });

  return (
    <div className="w-full space-y-4 py-6">
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        loadingLabel={`Loading ${name.toLowerCase()} appointments...`}
        errorLabel={`Error loading ${name.toLowerCase()} appointments`}
      />
      {!isLoading && !isError && (
        <>
          <DynamicGrid
            data={data?.rows ?? []}
            columnsConfig={columnsConfig}
            title={`${name} Appointments`}
            actions={[
              {
                label: "Mark Completed",
                icon: CheckCircle2,
                className:
                  "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
                onClick: (row) => completeMutation.mutate(row.appointment_id),
                // Only on your own appointments (the server enforces it too).
                show: (row) =>
                  row.appointment_status_name === "In Queue" &&
                  String(row.assigned_staff_id) === String(currentUserData?.user?.id),
              },
              {
                label: "Add Medical Record",
                icon: Stethoscope,
                className:
                  "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50",
                onClick: (row) => setConsultationAppointment(row),
                show: (row) =>
                  allowMedicalRecord &&
                  ["In Queue", "Completed"].includes(row.appointment_status_name),
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

      {consultationAppointment && (
        <AddConsultationModal
          appointment={consultationAppointment}
          onClose={() => setConsultationAppointment(null)}
        />
      )}
    </div>
  );
}
