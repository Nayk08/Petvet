import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Wallet, Receipt, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import AppointmentPaymentDetails from "@/components/ui/AppointmentPaymentDetails.jsx";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { Pagination } from "@/components/ui/Pagination";
import { PaymentTransactionModalColumns } from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { fetchMyPayments } from "@/api/clientPortal.js";
import { Button } from "@/components/ui/button.jsx";
import PortalPaySubmitModal from "./components/PortalPaySubmitModal.jsx";
import PortalReceiptModal from "./components/PortalReceiptModal.jsx";

// Status colours for the phone card list (same palette as the tables).
const PAYMENT_BADGE = {
  Pending: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  "Awaiting Verification": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  Cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
  "Refund Needed": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
  "Partially Paid": "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
};

export function Component() {
  const { page, limit, setPage, setLimit } = usePagination({ defaultLimit: 10 });
  const [payingPaymentId, setPayingPaymentId] = useState(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null); // payment shown in Details

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["clientPortal", "payments", page, limit],
    queryFn: ({ signal }) => fetchMyPayments({ page, limit, signal }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Payment History
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Payments made for your appointments. Store purchases made in
          person aren't linked to a client account and won't appear here.
        </p>
      </div>

      {isPending ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-rose-500 dark:text-rose-400">
          {error?.message ?? "Failed to load payment history"}
        </p>
      ) : (
        <>
          {/* Phones: one card per bill instead of a sideways-scrolling table. */}
          <div className="sm:hidden space-y-3">
            {(data?.rows ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-6">
                No payments yet.
              </p>
            ) : (
              (data?.rows ?? []).map((p) => {
                const canPay =
                  p.payment_status_name === "Pending" && Number(p.total_amount) > 0;
                const hasReceipt = p.payment_status_name === "Completed";
                return (
                  <div
                    key={p.payment_id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {p.control_number}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                          PAYMENT_BADGE[p.payment_status_name] ?? PAYMENT_BADGE.Pending
                        }`}
                      >
                        {p.payment_status_name}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {[p.pets_name, p.service_name].filter(Boolean).join(" · ") || "Appointment"}
                      </p>
                      {p.appointment_date && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Visit: {String(p.appointment_date).slice(0, 10)}
                          {p.payment_method ? ` · ${p.payment_method}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {Number(p.total_amount) > 0
                          ? `₱${Number(p.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "Priced at clinic"}
                        {p.payment_status_name === "Partially Paid" && (
                          <span className="block text-xs font-medium text-teal-700 dark:text-teal-300">
                            Paid ₱{Number(p.gcash_amount ?? 0).toFixed(2)} · pay ₱
                            {(Number(p.total_amount) - Number(p.gcash_amount ?? 0)).toFixed(2)} at the clinic
                            <span className="block text-amber-700 dark:text-amber-300">
                              Reservation fee is non-refundable if you don't show up.
                            </span>
                          </span>
                        )}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => setDetailsRow(p)} className="gap-1">
                        <Info size={14} />
                        Details
                      </Button>
                      {canPay && (
                        <Button size="sm" onClick={() => setPayingPaymentId(p.payment_id)} className="gap-1">
                          <Wallet size={14} />
                          Pay Now
                        </Button>
                      )}
                      {hasReceipt && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReceiptPaymentId(p.payment_id)}
                          className="gap-1"
                        >
                          <Receipt size={14} />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden sm:block">
          <DynamicGrid
            data={data?.rows ?? []}
            subtitle="Your appointment payments."
            columnsConfig={PaymentTransactionModalColumns}
            title="Payments"
            limit={limit}
            onLimitChange={setLimit}
            actions={[
              {
                label: "Pay Now",
                icon: Wallet,
                className:
                  "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40",
                onClick: (row) => setPayingPaymentId(row.payment_id),
                // ₱0 = priced at the clinic; nothing to pay online yet.
                show: (row) =>
                  row.payment_status_name === "Pending" && Number(row.total_amount) > 0,
              },
              {
                label: "Details",
                icon: Info,
                className:
                  "text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                onClick: (row) => setDetailsRow(row),
              },
              {
                label: "View Receipt",
                icon: Receipt,
                className:
                  "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40",
                onClick: (row) => setReceiptPaymentId(row.payment_id),
                show: (row) => row.payment_status_name === "Completed",
              },
            ]}
          />
          </div>
          <Pagination
            page={page}
            totalPages={limit === "all" ? 1 : (data?.pagination?.totalPages ?? 1)}
            onPageChange={setPage}
            disabled={isPending}
            total={data?.pagination?.total}
            limit={limit === "all" ? data?.pagination?.total : limit}
          />
        </>
      )}

      {detailsRow && (
        <Dialog open onOpenChange={(open) => !open && setDetailsRow(null)}>
          <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                {detailsRow.control_number} · {detailsRow.payment_status_name}
              </DialogDescription>
            </DialogHeader>
            <AppointmentPaymentDetails appt={detailsRow} payment={detailsRow} />
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {[
                ["Total", `₱${Number(detailsRow.total_amount).toFixed(2)}`],
                Number(detailsRow.gcash_amount) > 0 && ["Paid by GCash", `₱${Number(detailsRow.gcash_amount).toFixed(2)}`],
                Number(detailsRow.cash_amount) > 0 && ["Paid in cash", `₱${Number(detailsRow.cash_amount).toFixed(2)}`],
                detailsRow.payment_status_name === "Partially Paid" && [
                  "Balance (pay at clinic)",
                  `₱${(Number(detailsRow.total_amount) - Number(detailsRow.gcash_amount ?? 0)).toFixed(2)}`,
                ],
                detailsRow.gcash_reference_number && ["GCash reference", detailsRow.gcash_reference_number],
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 px-3.5 py-2">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
                  </div>
                ))}
            </div>
            {detailsRow.amount_sent != null && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                The reservation fee is non-refundable if you don't show up.
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {payingPaymentId && (
        <PortalPaySubmitModal
          paymentId={payingPaymentId}
          amount={
            data?.rows?.find((r) => r.payment_id === payingPaymentId)?.total_amount
          }
          details={data?.rows?.find((r) => r.payment_id === payingPaymentId)}
          // Only online bookings expire; a bill staff created doesn't.
          createdAt={(() => {
            const row = data?.rows?.find((r) => r.payment_id === payingPaymentId);
            return row?.created_by === "Client Portal" ? row.date_created : undefined;
          })()}
          onClose={() => setPayingPaymentId(null)}
        />
      )}

      {receiptPaymentId && (
        <PortalReceiptModal
          paymentId={receiptPaymentId}
          onClose={() => setReceiptPaymentId(null)}
        />
      )}
    </div>
  );
}
