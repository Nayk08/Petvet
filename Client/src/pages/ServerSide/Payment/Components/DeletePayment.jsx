import {
  useNavigate,
  useSubmit,
  useNavigation,
  useLoaderData,
  useLocation,
  redirect,
  useParams,
} from "react-router-dom";
import { toast } from "sonner";
import { XCircle, CheckCircle2, AlertTriangle } from "lucide-react";

import {
  deletePayment,
  fetchPaymentById,
  queryClient,
} from "../../../../api/http.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Component() {
  const { state } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const submit = useSubmit();
  const data = useLoaderData();
  const params = useParams();
  const paymentId = params.payment_id;
  const isSubmitting = state === "submitting";

  function closeModal() {
    navigate(`..${location.search}`);
  }

  function handleDelete() {
    submit(null, { method: "PATCH" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-2xl transition-colors">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
              Cancel Payment
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            Are you sure you want to cancel payment{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-200 font-mono">
              #{data?.payment_id || data?.id || paymentId}
            </span>
            {data?.total_amount && (
              <span>
                {" "}
                valued at{" "}
                <strong className="text-slate-900 dark:text-slate-100">
                  ₱{Number(data.total_amount).toFixed(2)}
                </strong>
              </span>
            )}
            ? This pending payment will be marked as cancelled.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2 gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={closeModal}
            disabled={isSubmitting}
            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
          >
            Keep Payment
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500 text-white font-semibold transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Cancelling..." : "Yes, cancel payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ["Payment", params.payment_id],
    queryFn: ({ signal }) => fetchPaymentById(params.payment_id, { signal }),
  });
}

export async function action({ request, params }) {
  const paymentId = params.payment_id;

  // Extract search parameters from the request URL since `location` is a hook
  const search = new URL(request.url).search;

  // Optimistically flip this row to Cancelled in every cached list that
  // could be showing it — the Payment module's own list AND the
  // Dashboard's "Today's Sales" widget — so whichever one you're on
  // updates instantly instead of waiting on the round trip. Snapshot both
  // first so a failure can roll them back.
  const patchRow = (old) => {
    if (!old?.rows) return old;
    return {
      ...old,
      rows: old.rows.map((row) =>
        String(row.payment_id) === String(paymentId)
          ? { ...row, payment_status_name: "Cancelled" }
          : row,
      ),
    };
  };
  const previousPaymentsQueries = [
    ...queryClient.getQueriesData({ queryKey: ["Payments"] }),
    ...queryClient.getQueriesData({ queryKey: ["TodayPayments"] }),
  ];
  queryClient.setQueriesData({ queryKey: ["Payments"] }, patchRow);
  queryClient.setQueriesData({ queryKey: ["TodayPayments"] }, patchRow);

  try {
    await deletePayment(paymentId);

    await queryClient.invalidateQueries({ queryKey: ["Payments"] });
    await queryClient.invalidateQueries({ queryKey: ["TodayPayments"] });
    await queryClient.invalidateQueries({ queryKey: ["Payment", paymentId] });
    await queryClient.invalidateQueries({ queryKey: ["RevenueSummary"] });
    await queryClient.invalidateQueries({ queryKey: ["TodayRevenueSummary"] });

    toast.success("Payment cancelled", {
      className:
        "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: `Payment #${paymentId} was successfully cancelled.`,
      descriptionClassName: "text-slate-400 text-sm font-normal mt-1",
      duration: 2000,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    });

    return redirect(`..${search}`);
  } catch (err) {
    // Roll back the optimistic update — the payment is still Pending.
    previousPaymentsQueries.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });

    toast.error("Cancel failed", {
      className:
        "bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description:
        err.message || "Something went wrong while canceling this payment.",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return redirect(`..${search}`);
  }
}
