import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/ui/Container";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { Pagination } from "@/components/ui/Pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TodayQueueColumns,
  PaymentColumns,
  paymentTransactionColumnsFor,
} from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import {
  fetchTodayRevenue,
  fetchTodayAppointments,
  fetchTodayPayments,
  fetchTodayRevenueTransactions,
  fetchCurrentUser,
  queryClient,
} from "@/api/http.js";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

// Which revenue card was clicked: the hero "Revenue" card shows everything
// (undefined type/method); the two row cards below it are keyed by
// payment method instead of Sales/Services, since that split is already
// shown in the hero card's own breakdown bars.
const REVENUE_MODALS = {
  all: { title: "Today's Transactions" },
  cash: { method: "cash", title: "Today's Cash Transactions" },
  cashless: { method: "gcash", title: "Today's Cashless Transactions" },
};

// Live date/time for the "Today's Live Queue" widget — makes it clear the
// table below is scoped to appointments scheduled for THIS calendar date,
// and ticks over automatically at midnight without needing a page refresh.
// Big clock in the Dashboard header — always clinic (Manila) time.
function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const opts = { timeZone: "Asia/Manila" };
  return (
    <div className="mb-1">
      <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
        {now.toLocaleTimeString("en-US", { ...opts, hour: "numeric", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {now.toLocaleDateString("en-US", { ...opts, weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </span>
      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
        {now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
    </div>
  );
}

export function Component() {
  const navigate = useNavigate();

  const {
    data: revenueSummary,
    isPending: isRevenuePending,
    isError: isRevenueError,
  } = useQuery({
    queryKey: ["TodayRevenueSummary"],
    queryFn: ({ signal }) => fetchTodayRevenue({ signal }),
  });

  const { data: currentUserData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: ({ signal }) => fetchCurrentUser({ signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const cashRevenue = Number(revenueSummary?.total_cash ?? 0);
  const gcashRevenue = Number(revenueSummary?.total_gcash ?? 0);
  const InvoiceRevenue = Number(revenueSummary?.total_invoice ?? 0);
  const AppointmentRevenue = Number(revenueSummary?.total_appointment ?? 0);
  const totalRevenue = cashRevenue + gcashRevenue;
  // Matches Payment_Model.js:getTodayRevenueSummary's actual field name —
  // this was previously read as `total_appointment_queue`, a field that
  // doesn't exist, so the card silently showed 0 no matter what.
  const appointmentQueueCount = Number(revenueSummary?.total_queue ?? 0);

  const revenueDisplay = (value) =>
    isRevenuePending
      ? "…"
      : isRevenueError
        ? "—"
        : `₱ ${value.toLocaleString()}`;

  // Revenue cards -> click-through modal listing the actual transactions
  // behind that number ("all" / "cash" / "cashless" key into
  // REVENUE_MODALS; null means closed).
  const [revenueModalKey, setRevenueModalKey] = useState(null);
  const [revenueModalSearch, setRevenueModalSearch] = useState("");
  const [revenueModalFilters, setRevenueModalFilters] = useState({});
  const [revenueModalPage, setRevenueModalPage] = useState(1); // 10 rows per page
  const activeRevenueModal = revenueModalKey
    ? REVENUE_MODALS[revenueModalKey]
    : null;
  const debouncedRevenueModalSearch = useDebouncedValue(revenueModalSearch, 400);

  // Opening a different card's modal shouldn't carry over a stale search
  // or Type filter from whichever one was open before.
  function openRevenueModal(key) {
    setRevenueModalKey(key);
    setRevenueModalSearch("");
    setRevenueModalFilters({});
    setRevenueModalPage(1);
  }

  const {
    data: revenueModalData,
    isPending: isRevenueModalPending,
    isError: isRevenueModalError,
    error: revenueModalError,
  } = useQuery({
    queryKey: [
      "TodayRevenueTransactions",
      activeRevenueModal?.type,
      activeRevenueModal?.method,
      debouncedRevenueModalSearch,
      revenueModalFilters,
      revenueModalPage,
    ],
    queryFn: ({ signal }) =>
      fetchTodayRevenueTransactions({
        type: revenueModalFilters.payment_type || activeRevenueModal?.type,
        method: activeRevenueModal?.method,
        search: debouncedRevenueModalSearch,
        page: revenueModalPage,
        limit: 10,
        signal,
      }),
    enabled: Boolean(activeRevenueModal),
    // Keeps the previous page's rows (and the search box mounted/focused)
    // while a new search/filter combination is fetching, instead of
    // dropping to isPending and unmounting the DynamicGrid every keystroke.
    placeholderData: keepPreviousData,
  });

  // Today's Live Queue (appointments)
  const [queueSearch, setQueueSearch] = useState("");
  const [queueFilters, setQueueFilters] = useState({});
  const {
    page: queuePage,
    limit: queueLimit,
    setPage: setQueuePage,
    setLimit: setQueueLimit,
  } = usePagination({ defaultLimit: 10 });
  const debouncedQueueSearch = useDebouncedValue(queueSearch, 400);

  useEffect(() => {
    setQueuePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQueueSearch, JSON.stringify(queueFilters)]);

  const {
    data: todayAppointments,
    isPending: isQueuePending,
    isError: isQueueError,
    error: queueError,
  } = useQuery({
    queryKey: [
      "TodayAppointments",
      queuePage,
      queueLimit,
      debouncedQueueSearch,
      queueFilters,
    ],
    queryFn: ({ signal }) =>
      fetchTodayAppointments({
        page: queuePage,
        limit: queueLimit,
        search: debouncedQueueSearch,
        filters: queueFilters,
        signal,
      }),
  });

  // Today's Sales (payments) — replicates the real Payment page: same
  // columns and row actions (View/Process/Delete), scoped to today.
  const [salesSearch, setSalesSearch] = useState("");
  const [salesFilters, setSalesFilters] = useState({});
  const {
    page: salesPage,
    limit: salesLimit,
    setPage: setSalesPage,
    setLimit: setSalesLimit,
  } = usePagination({ defaultLimit: 10 });
  const debouncedSalesSearch = useDebouncedValue(salesSearch, 400);

  useEffect(() => {
    setSalesPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSalesSearch, JSON.stringify(salesFilters)]);

  const {
    data: todaySales,
    isPending: isSalesPending,
    isError: isSalesError,
    error: salesError,
  } = useQuery({
    queryKey: [
      "TodayPayments",
      salesPage,
      salesLimit,
      debouncedSalesSearch,
      salesFilters,
    ],
    queryFn: ({ signal }) =>
      fetchTodayPayments({
        page: salesPage,
        limit: salesLimit,
        search: debouncedSalesSearch,
        filters: salesFilters,
        signal,
      }),
  });

  return (
    <div className="w-full space-y-8 py-8">
      {/* Header section */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-wide dark:text-white">
            Welcome Back, {currentUserData?.user?.name ?? "User"}!
          </h1>
          {currentUserData?.user?.role && (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {currentUserData.user.role}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Here is what's happening at PetVet clinic today.
          </p>
        </div>
        <div className="text-right">
          <HeaderClock />
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Clinic Status: Open
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Hours: 09:00 AM - 06:00 PM
          </p>
        </div>
      </div>

      {/* Analytics/Metrics Grid */}
      <div className="flex flex-col lg:flex-row gap-4">
        <Container
          variant="hero"
          title="Revenue"
          value={revenueDisplay(totalRevenue)}
          breakdown={[
            {
              label: "Sales",
              value: InvoiceRevenue,
              displayValue: revenueDisplay(InvoiceRevenue),
              barColor: "bg-rose-500",
            },
            {
              label: "Services",
              value: AppointmentRevenue,
              displayValue: revenueDisplay(AppointmentRevenue),
              barColor: "bg-teal-500",
            },
          ]}
          className="lg:w-1/4"
          onClick={() => openRevenueModal("all")}
        />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          <Container
            title="Cash"
            value={revenueDisplay(cashRevenue)}
            onClick={() => openRevenueModal("cash")}
          />
          <Container
            title="Cashless"
            value={revenueDisplay(gcashRevenue)}
            onClick={() => openRevenueModal("cashless")}
          />
          <Container
            title="Today's Appointments"
            value={appointmentQueueCount}
          />
        </div>
      </div>

      <Dialog
        open={Boolean(activeRevenueModal)}
        onOpenChange={(isOpen) => !isOpen && setRevenueModalKey(null)}
      >
        {activeRevenueModal && (
          <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{activeRevenueModal.title}</DialogTitle>
            </DialogHeader>
            {isRevenueModalPending ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading transactions...
              </p>
            ) : isRevenueModalError ? (
              <p className="text-sm text-rose-500 dark:text-rose-400">
                {revenueModalError?.message ??
                  "Error loading transactions"}
              </p>
            ) : (
              // Only the table scrolls; the title and page numbers stay put.
              <div className="min-h-0 flex-1 overflow-y-auto">
              <DynamicGrid
                data={revenueModalData?.rows ?? []}
                columnsConfig={paymentTransactionColumnsFor(activeRevenueModal?.method)}
                search={revenueModalSearch}
                onSearchChange={(value) => {
                  setRevenueModalSearch(value);
                  setRevenueModalPage(1);
                }}
                filters={revenueModalFilters}
                onFiltersChange={(value) => {
                  setRevenueModalFilters(value);
                  setRevenueModalPage(1);
                }}
                bare
              />
              </div>
            )}
            {revenueModalData?.pagination && (
              <Pagination
                page={revenueModalPage}
                totalPages={revenueModalData.pagination.totalPages ?? 1}
                onPageChange={setRevenueModalPage}
                total={revenueModalData.pagination.total}
                limit={10}
              />
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Today's Live Queue */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Today's Live Queue
        </h2>
        <LiveClock />
      </div>
      <DynamicGrid
        data={todayAppointments?.rows ?? []}
        columnsConfig={TodayQueueColumns}
        title="Appointments scheduled for today"
        limit={queueLimit}
        search={queueSearch}
        onSearchChange={setQueueSearch}
        filters={queueFilters}
        onFiltersChange={setQueueFilters}
        onLimitChange={setQueueLimit}
      />
      {isQueuePending ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loading today's queue...
        </p>
      ) : isQueueError ? (
        <p className="text-sm text-rose-500 dark:text-rose-400">
          {queueError?.message ?? "Error loading today's queue"}
        </p>
      ) : (
        <Pagination
          page={queuePage}
          totalPages={
            queueLimit === "all"
              ? 1
              : (todayAppointments?.pagination?.totalPages ?? 1)
          }
          onPageChange={setQueuePage}
          disabled={isQueuePending}
          total={todayAppointments?.pagination?.total}
          limit={
            queueLimit === "all"
              ? todayAppointments?.pagination?.total
              : queueLimit
          }
        />
      )}

      {/* Today's Sales */}
      <DynamicGrid
        data={todaySales?.rows ?? []}
        columnsConfig={PaymentColumns}
        title="Today's Sales"
        onView={(row) => navigate(`/payments/view-payment/${row.payment_id}`)}
        onProcess={(row) =>
          navigate(`/payments/process-payment/${row.payment_id}?from=dashboard`)
        }
        onDelete={(row) =>
          navigate(`/payments/delete-payment/${row.payment_id}`)
        }
        // Partially Paid: "Process" collects the balance of an online deposit.
        canProcess={(row) =>
          row.payment_status_name === "Pending" ||
          row.payment_status_name === "Partially Paid"
        }
        canView={(row) =>
          row.payment_status_name === "Completed" ||
          row.payment_status_name === "Cancelled" ||
          row.payment_status_name === "Partially Paid"
        }
        canDelete={(row) => row.payment_status_name === "Pending"}
        limit={salesLimit}
        search={salesSearch}
        onSearchChange={setSalesSearch}
        filters={salesFilters}
        onFiltersChange={setSalesFilters}
        onLimitChange={setSalesLimit}
      />
      {isSalesPending ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loading today's sales...
        </p>
      ) : isSalesError ? (
        <p className="text-sm text-rose-500 dark:text-rose-400">
          {salesError?.message ?? "Error loading today's sales"}
        </p>
      ) : (
        <Pagination
          page={salesPage}
          totalPages={
            salesLimit === "all" ? 1 : (todaySales?.pagination?.totalPages ?? 1)
          }
          onPageChange={setSalesPage}
          disabled={isSalesPending}
          total={todaySales?.pagination?.total}
          limit={
            salesLimit === "all" ? todaySales?.pagination?.total : salesLimit
          }
        />
      )}
    </div>
  );
}

export async function loader() {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["TodayRevenueSummary"],
      queryFn: ({ signal }) => fetchTodayRevenue({ signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["TodayAppointments", 1, 10, "", {}],
      queryFn: ({ signal }) =>
        fetchTodayAppointments({
          page: 1,
          limit: 10,
          search: "",
          filters: {},
          signal,
        }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["TodayPayments", 1, 10, "", {}],
      queryFn: ({ signal }) =>
        fetchTodayPayments({
          page: 1,
          limit: 10,
          search: "",
          filters: {},
          signal,
        }),
    }),
  ]);
  return null;
}
