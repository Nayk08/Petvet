import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Receipt,
  Calendar,
  CreditCard,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { fetchPaymentById } from "@/api/http";
import { formatDate } from "@/utils/COLUMNS";

export function Component() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const paymentId = params.payment_id;

  const {
    data: payment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => fetchPaymentById(paymentId),
    enabled: !!paymentId,
  });

  function closeModal() {
    navigate(`..${location.search}`);
  }

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isError) {
    toast.error("Could not load payment details");
  }

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "paid":
      case "succeeded":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
          icon: (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ),
        };
      case "pending":
      case "processing":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
          icon: (
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
          ),
        };
      default:
        return {
          bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
          icon: (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          ),
        };
    }
  };

  const statusStyle = payment
    ? getStatusBadge(payment.payment_status_name)
    : null;

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md p-0 overflow-hidden shadow-xl rounded-2xl transition-colors">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-slate-100 tracking-tight">
                Payment Details
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {paymentId ? `#${paymentId}` : "Transaction overview"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Static Content Body */}
        <div className="px-6 py-5 relative space-y-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="h-6 w-6 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Fetching record...
              </p>
            </div>
          )}

          {!isLoading && payment && (
            <>
              {/* Status & Amount */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                    Total Paid
                  </span>
                  <span className="text-2xl font-bold text-slate-950 dark:text-slate-100 tracking-tight">
                    {payment.total_amount
                      ? `$${payment.total_amount}`
                      : "$0.00"}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusStyle.bg}`}
                >
                  {statusStyle.icon}
                  <span className="capitalize">
                    {payment.payment_status_name}
                  </span>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <FieldCard
                  icon={
                    <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  }
                  label="Date Created"
                  value={formatDate(payment.date_created) || "—"}
                />
                <FieldCard
                  icon={
                    <CreditCard className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  }
                  label="Payment Method"
                  value={payment.payment_method}
                />
                <FieldCard
                  icon={
                    <Hash className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  }
                  label="Control Number"
                  value={payment.control_number}
                  onCopy={() => copyToClipboard(payment.control_number)}
                />
                {payment.gcash_reference_number && (
                  <FieldCard
                    icon={
                      <Hash className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    }
                    label="GCash Reference"
                    value={payment.gcash_reference_number}
                    onCopy={() => copyToClipboard(payment.gcash_reference_number)}
                  />
                )}
                {payment.payment_method === "Split" && (
                  <>
                    <FieldCard
                      icon={
                        <CreditCard className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      }
                      label="Cash Portion"
                      value={
                        payment.cash_amount != null
                          ? `$${payment.cash_amount}`
                          : "—"
                      }
                    />
                    <FieldCard
                      icon={
                        <CreditCard className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      }
                      label="GCash Portion"
                      value={
                        payment.gcash_amount != null
                          ? `$${payment.gcash_amount}`
                          : "—"
                      }
                    />
                  </>
                )}
              </div>

              {/* Purchased Line Items */}
              {payment.items && payment.items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Summary Breakdown
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {payment.items.length}{" "}
                      {payment.items.length === 1 ? "Item" : "Items"}
                    </span>
                  </div>

                  {/* Isolated Scroll View */}
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 divide-y divide-slate-200 dark:divide-slate-800 shadow-inner [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#334155_transparent]">
                    {payment.items.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex items-center justify-between px-3.5 py-2.5 hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {item.product_name}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 shrink-0">
                          ${item.item_price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <Button
            variant="secondary"
            onClick={closeModal}
            className="w-full sm:w-auto bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium h-9"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldCard({ label, value, icon, onCopy }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
            {label}
          </span>
        </div>
        {onCopy && value && (
          <button
            onClick={onCopy}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Copy value"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono truncate">
        {value || "—"}
      </p>
    </div>
  );
}
