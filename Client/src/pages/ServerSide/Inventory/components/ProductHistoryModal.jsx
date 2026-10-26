import { useQuery } from "@tanstack/react-query";
import { History, PlusCircle, Pencil, Trash2, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchProductHistory, fetchProductSalesHistory } from "@/api/http";
import { formatDateTime } from "@/utils/COLUMNS";

// One line of the audit trail: what happened, when, and by whom.
function AuditLine({ icon: Icon, label, date, by, tone }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <span className="font-semibold text-slate-900 dark:text-white">{label}</span>{" "}
        <span className="text-slate-600 dark:text-slate-300">
          {formatDateTime(date) || "date not recorded"}
          {" · by "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {by || "unknown"}
          </span>
        </span>
      </div>
    </div>
  );
}

// Every batch of the product (active and deleted): created, last updated, deleted.
// `productId` narrows it to that one batch (the per-batch History button).
export default function ProductHistoryModal({ productName, productId, onClose }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["inventory-history", productName],
    queryFn: ({ signal }) => fetchProductHistory({ product_name: productName, signal }),
    enabled: Boolean(productName),
  });
  const history = productId
    ? data?.filter((b) => String(b.product_id) === String(productId))
    : data;

  const { data: sales, isPending: salesPending } = useQuery({
    queryKey: ["inventory-sales-history", productName],
    queryFn: ({ signal }) => fetchProductSalesHistory({ product_name: productName, signal }),
    enabled: Boolean(productName),
  });

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Product History
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300">
            {productId
              ? `${productName} · Batch #${productId} — who created, updated and deleted it.`
              : `${productName} — who created, updated and deleted each batch.`}
          </DialogDescription>
        </DialogHeader>

        {isPending && <p className="text-sm text-slate-600 dark:text-slate-300 py-6 text-center">Loading history...</p>}
        {isError && <p className="text-sm text-rose-500 py-6 text-center">{error.message}</p>}
        {history?.length === 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-300 py-6 text-center">No history for this product.</p>
        )}

        <div className="space-y-3">
          {history?.map((b) => (
            <div
              key={b.product_id}
              className={`rounded-lg border p-3.5 space-y-2.5 ${
                b.is_deleted
                  ? "border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/40"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Batch #{b.product_id}
                  <span className="font-normal text-slate-600 dark:text-slate-300">
                    {" · "}Qty {b.product_quantity} · ₱{Number(b.product_price).toFixed(2)}
                    {b.product_expiry_date ? ` · Exp ${String(b.product_expiry_date).slice(0, 10)}` : ""}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    b.is_deleted
                      ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  {b.is_deleted ? "Deleted" : "Active"}
                </span>
              </div>

              <AuditLine icon={PlusCircle} label="Created" date={b.date_created} by={b.created_by} tone="text-emerald-600 dark:text-emerald-400" />
              {b.date_updated && (
                <AuditLine icon={Pencil} label="Last updated" date={b.date_updated} by={b.updated_by} tone="text-indigo-600 dark:text-indigo-300" />
              )}
              {b.is_deleted && (
                <AuditLine icon={Trash2} label="Deleted" date={b.date_deleted} by={b.deleted_by} tone="text-rose-600 dark:text-rose-400" />
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Sales Transactions
          </h3>

          {salesPending && (
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-2">Loading transactions...</p>
          )}
          {!salesPending && sales?.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-2">No sales for this product yet.</p>
          )}

          {sales?.length > 0 && (
            <div className="space-y-2">
              {sales.map((s) => (
                <div
                  key={`${s.payment_id}-${s.control_number}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-3 text-[13px]"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {s.control_number}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {" · "}{formatDateTime(s.payment_date) || "date not recorded"}
                    </span>
                  </div>
                  <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">
                    Qty {s.quantity} · ₱{Number(s.subtotal).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
