import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { fetchMyPaymentReceipt } from "@/api/clientPortal.js";
import ReceiptContent from "@/pages/ServerSide/Payment/Components/ReceiptContent.jsx";

export default function PortalReceiptModal({ paymentId, onClose }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["clientPortal", "payment-receipt", paymentId],
    queryFn: ({ signal }) => fetchMyPaymentReceipt(paymentId, { signal }),
    enabled: Boolean(paymentId),
  });

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-sm p-0 overflow-hidden shadow-2xl transition-colors">
        <DialogHeader className="px-6 pt-5 pb-3 print:hidden">
          <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-slate-100">
            Receipt
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
            {paymentId ? `Payment #${paymentId}` : ""}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 print:hidden">
            <div className="h-6 w-6 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading receipt...
            </p>
          </div>
        ) : isError ? (
          <div className="px-6 py-8 text-center print:hidden">
            <p className="text-sm text-rose-500 dark:text-rose-400">
              {error?.message || "Failed to load receipt."}
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <ReceiptContent payment={data?.payment} appointment={data?.appointment} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 print:hidden">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={isPending || isError}
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer size={15} />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
