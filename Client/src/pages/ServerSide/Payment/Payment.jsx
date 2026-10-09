import DynamicGrid from "@/components/ui/DynamicGrid";
import PaymentStatusChips from "@/components/ui/PaymentStatusChips.jsx";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileDown, QrCode, ShieldCheck, Printer, Undo2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  fetchPayments,
  fetchRevenueSummary,
  fetchRevenueTransactions,
  markPaymentRefunded,
} from "@/api/http";
import { PaymentColumns, paymentTransactionColumnsFor } from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import QueryState from "@/components/ui/QueryState";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generatePaymentsReport } from "@/utils/generatePaymentsReport.js";
import ManageQrCodeModal from "./Components/ManageQrCodeModal.jsx";
import { optimisticMutation, patchWhere } from "@/api/optimistic.js";

// Which revenue card was clicked: the hero "Total Revenue" card shows
// everything; the two row cards are keyed by payment method (Cash/
// Cashless) rather than Sales/Services, since that split is already shown
// in the hero card's own breakdown bars.
const REVENUE_MODALS = {
  all: { title: "All Transactions" },
  cash: { method: "cash", title: "Cash Transactions" },
  cashless: { method: "gcash", title: "Cashless Transactions" },
};

export function Component() {
  const navigate = useNavigate();
  const [refundPayment, setRefundPayment] = useState(null);
  // Optimistic: a refunded bill ends as Cancelled; shown at once.
  const refundMutation = useMutation({
    mutationFn: markPaymentRefunded,
    ...optimisticMutation({
      keys: [["Payments"], ["TodayPayments"]],
      update: (row, id) =>
        patchWhere("payment_id", id, { payment_status_name: "Cancelled" })(row),
      onMutate: () => setRefundPayment(null),
      onSuccess: () => toast.success("Payment marked refunded"),
      onError: (error) => toast.error("Could not mark refunded", { description: error.message }),
    }),
  });
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
    placeholderData: keepPreviousData, // status chips/table stay put while filtering
  });

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Reports what the table is CURRENTLY showing — same search/filters,
  // but every matching row rather than just the current page.
  async function handleGenerateReport() {
    setIsGeneratingReport(true);
    try {
      const allMatching = await fetchPayments({
        page: 1,
        limit: "all",
        search: debouncedSearch,
        filters,
      });
      if (!allMatching.rows?.length) {
        toast.info("No payments match the current filters");
        return;
      }
      generatePaymentsReport(allMatching.rows, {
        search: debouncedSearch,
        filters,
      });
    } catch (err) {
      toast.error("Failed to generate report", {
        description: err.message || "Something went wrong.",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  }

  const {
    data: revenueSummary,
    isPending: isRevenuePending,
    isError: isRevenueError,
  } = useQuery({
    queryKey: ["RevenueSummary"],
    queryFn: ({ signal }) => fetchRevenueSummary({ signal }),
  });

  const cashRevenue = Number(revenueSummary?.total_cash ?? 0);
  const gcashRevenue = Number(revenueSummary?.total_gcash ?? 0);
  const InvoiceRevenue = Number(revenueSummary?.total_invoice ?? 0);
  const AppointmentRevenue = Number(revenueSummary?.total_appointment ?? 0);
  const totalRevenue = cashRevenue + gcashRevenue;
  const revenueDisplay = (value) =>
    isRevenuePending
      ? "…"
      : isRevenueError
        ? "—"
        : `₱ ${value.toLocaleString()}`;

  const [showQrModal, setShowQrModal] = useState(false);

  const [revenueModalKey, setRevenueModalKey] = useState(null);
  const [revenueModalSearch, setRevenueModalSearch] = useState("");
  const [revenueModalFilters, setRevenueModalFilters] = useState({});
  const [revenueModalPage, setRevenueModalPage] = useState(1);
  const [revenueModalLimit, setRevenueModalLimit] = useState(10); // 10 / 50 / "all"
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
      "RevenueTransactions",
      activeRevenueModal?.type,
      activeRevenueModal?.method,
      debouncedRevenueModalSearch,
      revenueModalFilters,
      revenueModalPage,
      revenueModalLimit,
    ],
    queryFn: ({ signal }) =>
      fetchRevenueTransactions({
        type: revenueModalFilters.payment_type || activeRevenueModal?.type,
        method: activeRevenueModal?.method,
        search: debouncedRevenueModalSearch,
        page: revenueModalPage,
        limit: revenueModalLimit,
        signal,
      }),
    enabled: Boolean(activeRevenueModal),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowQrModal(true)}
          className="flex items-center gap-2"
        >
          <QrCode size={14} />
          <span>Manage QR Code</span>
        </Button>
      </div>

      {/* Analytics/Metrics Grid */}
      <div className="flex flex-col lg:flex-row gap-4">
        <Container
          variant="hero"
          title="Total Revenue"
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
                {revenueModalError?.message ?? "Error loading transactions"}
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
                limit={revenueModalLimit}
                limitOptions={[10, 50, "all"]}
                onLimitChange={(value) => {
                  setRevenueModalLimit(value);
                  setRevenueModalPage(1);
                }}
                bare
              />
              </div>
            )}
            {revenueModalData?.pagination && (
              <Pagination
                page={revenueModalPage}
                totalPages={
                  revenueModalLimit === "all" ? 1 : (revenueModalData.pagination.totalPages ?? 1)
                }
                onPageChange={setRevenueModalPage}
                total={revenueModalData.pagination.total}
                limit={revenueModalLimit === "all" ? revenueModalData.pagination.total : revenueModalLimit}
              />
            )}
          </DialogContent>
        )}
      </Dialog>

      <QueryState
        isLoading={isPending}
        isError={isError}
        error={error}
        loadingLabel="Loading payments..."
        errorLabel="Error loading payments"
      />
      {!isPending && !isError && (
        <>
          <PaymentStatusChips
            counts={data?.status_counts}
            filters={filters}
            onFiltersChange={setFilters}
          />
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
            // Partially Paid: "Process" collects the balance of an online deposit.
            canProcess={(row) =>
              row.payment_status_name === "Pending" ||
              row.payment_status_name === "Partially Paid"
            }
            // Only show "View" when money has moved (or the bill is closed)
            canView={(row) =>
              row.payment_status_name === "Completed" ||
              row.payment_status_name === "Cancelled" ||
              row.payment_status_name === "Partially Paid"
            }
            canDelete={(row) => row.payment_status_name === "Pending"}
            actions={[
              {
                label: "Verify",
                icon: ShieldCheck,
                className:
                  "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40",
                onClick: (row) =>
                  navigate({
                    pathname: `verify-payment/${row.payment_id}`,
                    search: window.location.search,
                  }),
                show: (row) => row.payment_status_name === "Awaiting Verification",
              },
              {
                label: "Print Receipt",
                icon: Printer,
                className:
                  "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40",
                onClick: (row) =>
                  navigate({
                    pathname: `receipt/${row.payment_id}`,
                    search: window.location.search,
                  }),
                show: (row) => row.payment_status_name === "Completed",
              },
              {
                label: "Mark Refunded",
                icon: Undo2,
                className:
                  "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40",
                onClick: (row) => setRefundPayment(row),
                show: (row) => row.payment_status_name === "Refund Needed",
              },
            ]}
            limit={limit}
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            onLimitChange={setLimit}
            extraActions={
              <Button
                type="button"
                variant="outline"
                size="default"
                disabled={isGeneratingReport}
                onClick={handleGenerateReport}
                className="flex items-center gap-2"
              >
                <FileDown size={14} />
                <span>{isGeneratingReport ? "Generating..." : "Generate Report"}</span>
              </Button>
            }
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

      <ConfirmDialog
        open={Boolean(refundPayment)}
        onOpenChange={(open) => !open && setRefundPayment(null)}
        title="Mark as refunded?"
        description={`Confirm the ₱${Number(refundPayment?.total_amount ?? 0).toFixed(2)} for ${refundPayment?.control_number ?? "this payment"} has been returned to the client. This closes it out.`}
        confirmLabel="Mark Refunded"
        isConfirming={refundMutation.isPending}
        onConfirm={() => refundMutation.mutate(refundPayment.payment_id)}
      />

      {showQrModal && (
        <ManageQrCodeModal onClose={() => setShowQrModal(false)} />
      )}
    </div>
  );
}
