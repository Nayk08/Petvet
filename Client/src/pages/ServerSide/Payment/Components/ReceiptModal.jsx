import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchPaymentById, fetchAppointmentById } from "@/api/http";
import ReceiptContent from "./ReceiptContent.jsx";

// The Payment module's "Print Receipt" row action — fetches the payment
// (and its linked appointment, for an APT charge) fresh every time, so a
// reprint always reflects the current record rather than whatever was
// cached from when it was first completed.
export function Component() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const paymentId = params.payment_id;

  const { data: payment, isPending } = useQuery({
    queryKey: ["Payment", paymentId, "receipt"],
    queryFn: () => fetchPaymentById(paymentId),
    enabled: Boolean(paymentId),
  });

  const { data: appointment } = useQuery({
    queryKey: ["appointment-for-receipt", payment?.appointment_id],
    queryFn: () => fetchAppointmentById(payment.appointment_id),
    enabled: Boolean(payment?.appointment_id),
  });

  function closeModal() {
    navigate(`..${location.search}`);
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
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
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <ReceiptContent payment={payment} appointment={appointment} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 print:hidden">
          <Button
            type="button"
            variant="ghost"
            onClick={closeModal}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={isPending}
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
