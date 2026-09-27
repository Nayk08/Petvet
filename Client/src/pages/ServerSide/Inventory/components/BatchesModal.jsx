import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, PackagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { fetchProductBatches } from "@/api/http";

const STATUS_STYLES = {
  "High Stock":
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  "Average Stock":
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  "Low Stock":
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
  "Out of Stock":
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
        STATUS_STYLES[status] ??
        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
      }`}
    >
      {status ?? "Unknown"}
    </span>
  );
}

function formatExpiry(dateString) {
  if (!dateString) return "No expiry set";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BatchesModal({ productName, onClose }) {
  const navigate = useNavigate();

  const { data: batches, isPending, isError, error } = useQuery({
    queryKey: ["inventory-batches", productName],
    queryFn: ({ signal }) =>
      fetchProductBatches({ product_name: productName, signal }),
    enabled: Boolean(productName),
  });

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-lg shadow-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            {productName}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            {batches?.length ?? 0} separate batches, each with its own
            quantity, price, and expiry date.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading batches...
            </p>
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-rose-500 dark:text-rose-400">
            {error?.message ?? "Failed to load batches"}
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto -mx-1 px-1 space-y-2 scrollbar-thin [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#334155_transparent]">
            {batches.map((batch) => (
              <div
                key={batch.product_id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3"
              >
                <div className="w-12 h-12 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden flex items-center justify-center">
                  {batch.product_image ? (
                    <img
                      src={batch.product_image}
                      alt={productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      No image
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Qty {batch.product_quantity}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      ₱
                      {Number(batch.product_price).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs ${
                        batch.is_expired
                          ? "text-red-500 dark:text-red-400 font-medium"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Expires {formatExpiry(batch.product_expiry_date)}
                    </span>
                    <StatusBadge status={batch.status_name} />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Add quantity to this batch"
                    onClick={() =>
                      navigate(`add-quantity/${batch.product_id}`)
                    }
                    className="h-8 w-8 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Edit this batch"
                    onClick={() =>
                      navigate(`edit-product/${batch.product_id}`)
                    }
                    className="h-8 w-8 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Delete this batch"
                    onClick={() =>
                      navigate(`delete-product/${batch.product_id}`)
                    }
                    className="h-8 w-8 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
