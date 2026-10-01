import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Wallet, Receipt } from "lucide-react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { Pagination } from "@/components/ui/Pagination";
import { PaymentTransactionModalColumns } from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { fetchMyPayments } from "@/api/clientPortal.js";
import PortalPaySubmitModal from "./components/PortalPaySubmitModal.jsx";
import PortalReceiptModal from "./components/PortalReceiptModal.jsx";

export function Component() {
  const { page, limit, setPage, setLimit } = usePagination({ defaultLimit: 10 });
  const [payingPaymentId, setPayingPaymentId] = useState(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState(null);

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
          <DynamicGrid
            data={data?.rows ?? []}
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
                show: (row) => row.payment_status_name === "Pending",
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

      {payingPaymentId && (
        <PortalPaySubmitModal
          paymentId={payingPaymentId}
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
