import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  redirect,
  useNavigate,
  useParams,
  useSubmit,
  useNavigation,
  useActionData,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";
import {
  queryClient,
  invalidateAppointmentQueries,
  fetchPaymentById,
  fetchAppointmentById,
  completePayment,
  applyOptimisticRevenue,
  estimatePaymentSplit,
} from "@/api/http";
import PaymentMethodPicker from "@/components/ui/PaymentMethodPicker.jsx";
import {
  evaluatePaymentAmount,
  requiresExactAmount,
} from "@/utils/paymentValidation.js";

function formatDateLabel(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Component() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useNavigation();
  const params = useParams();
  const paymentId = params.payment_id;
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;

  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const isSplit = paymentMethod === "Split";

  const [amountPaid, setAmountPaid] = useState("");
  const [splitCashPaid, setSplitCashPaid] = useState("");
  const [splitGcashPaid, setSplitGcashPaid] = useState("");
  const [change, setChange] = useState(0);
  const [hasValidPayment, setHasValidPayment] = useState(false);

  const cameFromDashboard =
    new URLSearchParams(location.search).get("from") === "dashboard";

  function closeModal() {
    navigate(cameFromDashboard ? "/dashboard" : `..${location.search}`);
  }

  const {
    data: payment,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["Payment", paymentId],
    queryFn: ({ signal }) => fetchPaymentById(paymentId, { signal }),
  });

  const { data: appointment } = useQuery({
    queryKey: ["appointment", payment?.appointment_id],
    queryFn: ({ signal }) =>
      fetchAppointmentById(payment.appointment_id, { signal }),
    enabled: Boolean(payment?.appointment_id),
  });

  const cartItems = payment?.items ?? [];
  const subtotal = Number(payment?.total_amount ?? 0);

  useEffect(() => {
    const hasAnyInput = isSplit
      ? splitCashPaid !== "" || splitGcashPaid !== ""
      : amountPaid !== "";

    if (!hasAnyInput) {
      setHasValidPayment(false);
      setChange(0);
      return;
    }

    const paid = isSplit
      ? (parseFloat(splitCashPaid) || 0) + (parseFloat(splitGcashPaid) || 0)
      : parseFloat(amountPaid);

    const { isValid, change: computedChange } = evaluatePaymentAmount({
      paymentMethod,
      receivedTotal: paid,
      total: subtotal,
    });
    setHasValidPayment(isValid);
    setChange(computedChange);
  }, [amountPaid, splitCashPaid, splitGcashPaid, isSplit, paymentMethod, subtotal]);

  function handleSubmit(event) {
    event.preventDefault();
    submit(event.currentTarget, { method: "post" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
            {payment?.appointment_id ? "Appointment Payment" : "Order Summary"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {payment?.appointment_id
              ? "Review the appointment details before completing payment."
              : "Review your purchase details before completing payment."}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-cyan-500 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading order...
            </p>
          </div>
        ) : isError ? (
          <div className="py-6 text-center text-sm text-rose-500 dark:text-rose-400">
            {error?.message ?? "Failed to load payment"}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="payment_id" value={paymentId ?? ""} />

            {payment?.appointment_id ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-1.5 text-sm my-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Client</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {appointment?.client_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Pet</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {appointment?.pets_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Service</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {appointment?.service_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Staff</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {appointment?.staff_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Date / Time</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {appointment
                      ? `${formatDateLabel(appointment.appointment_date)}, ${formatTimeLabel(appointment.start_time)}`
                      : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-2 border-y border-slate-200 dark:border-slate-800 max-h-52 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div
                    key={item.cart_item_id}
                    className="flex justify-between items-center text-sm"
                  >
                    <div className="truncate pr-4">
                      <p className="text-slate-800 dark:text-slate-200 truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">
                      ₱{(item.item_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center font-bold text-base pt-3">
              <span className="text-slate-700 dark:text-slate-300">Total</span>
              <span className="text-cyan-700 dark:text-cyan-400 text-lg">
                ₱{subtotal.toFixed(2)}
              </span>
            </div>

            <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />

            {isSplit ? (
              <>
                <div className="flex items-center justify-between gap-4 pt-3">
                  <label
                    htmlFor="amount-paid-cash"
                    className="text-sm text-slate-700 dark:text-slate-300 shrink-0"
                  >
                    Cash received
                  </label>
                  <div className="flex items-center gap-1 w-36">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      ₱
                    </span>
                    <Input
                      id="amount-paid-cash"
                      name="cash_received"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={splitCashPaid}
                      onChange={(e) => setSplitCashPaid(e.target.value)}
                      className="bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right focus-visible:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2">
                  <label
                    htmlFor="amount-paid-gcash"
                    className="text-sm text-slate-700 dark:text-slate-300 shrink-0"
                  >
                    GCash received
                  </label>
                  <div className="flex items-center gap-1 w-36">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      ₱
                    </span>
                    <Input
                      id="amount-paid-gcash"
                      name="gcash_received"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={splitGcashPaid}
                      onChange={(e) => setSplitGcashPaid(e.target.value)}
                      className="bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right focus-visible:ring-cyan-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-4 pt-3">
                <label
                  htmlFor="amount-paid"
                  className="text-sm text-slate-700 dark:text-slate-300 shrink-0"
                >
                  Amount received
                </label>
                <div className="flex items-center gap-1 w-36">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    ₱
                  </span>
                  <Input
                    id="amount-paid"
                    name="amount_paid"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right focus-visible:ring-cyan-500"
                  />
                </div>
              </div>
            )}

            {!hasValidPayment &&
              (isSplit
                ? splitCashPaid !== "" || splitGcashPaid !== ""
                : amountPaid !== "") && (
                <p className="text-xs text-amber-500 dark:text-amber-400 text-right pt-1">
                  {requiresExactAmount(paymentMethod)
                    ? `Amount received must exactly equal ₱${subtotal.toFixed(2)} — GCash doesn't give change`
                    : `Amount received must be at least ₱${subtotal.toFixed(2)}`}
                </p>
              )}

            <div className="flex justify-between items-center font-bold text-base pt-3 pb-1">
              <span className="text-slate-700 dark:text-slate-300">Change</span>
              <span className="text-cyan-700 dark:text-cyan-400 text-lg">
                ₱{change.toFixed(2)}
              </span>
            </div>

            {isActionError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 mt-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400 text-xs leading-relaxed">
                <span className="flex-1">{actionError}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              {state !== "submitting" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={!hasValidPayment || state === "submitting"}
                className="bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {state === "submitting" ? "Placing order..." : "Confirm Order"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ["Payment", params.payment_id],
    queryFn: ({ signal }) => fetchPaymentById(params.payment_id, { signal }),
  });
}

export async function action({ params, request }) {
  const requestUrl = new URL(request.url);
  // Preserve the parent list's query string (e.g. ?page=2&limit=10)
  // so completing the order doesn't bounce the user back to page 1.
  const referrerSearch = requestUrl.search;
  // Processing from the Dashboard's "Today's Sales" widget should return
  // to the Dashboard, not the Payment module's list — the row was reached
  // via an absolute /payments/process-payment/:id navigation carrying
  // ?from=dashboard, since this route always lives under /payments
  // regardless of which page linked into it.
  const cameFromDashboard = requestUrl.searchParams.get("from") === "dashboard";
  const formData = await request.formData();
  const payment_method = formData.get("payment_method");

  // Optimistically flip this row to Completed in every cached list that
  // could be showing it — the Payment module's own list AND the
  // Dashboard's "Today's Sales" widget — so whichever one you're on
  // updates instantly instead of waiting on the round trip. Snapshot both
  // first so a failure can roll them back.
  const patchRow = (old) => {
    if (!old?.rows) return old;
    return {
      ...old,
      rows: old.rows.map((row) =>
        String(row.payment_id) === String(params.payment_id)
          ? { ...row, payment_status_name: "Completed", payment_method }
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

  // The cached ["Payment", id] entry (prefetched by this route's own
  // loader) already has total_amount/appointment_id — enough to estimate
  // the revenue bump without waiting on the server's response.
  const cachedPayment = queryClient.getQueryData(["Payment", params.payment_id]);
  const { cashAmount, gcashAmount } = estimatePaymentSplit({
    paymentMethod: payment_method,
    totalAmount: cachedPayment?.total_amount,
    cashReceived: formData.get("cash_received"),
    gcashReceived: formData.get("gcash_received"),
  });
  const rollbackRevenue = applyOptimisticRevenue({
    cashAmount,
    gcashAmount,
    totalAmount: cachedPayment?.total_amount,
    isAppointment: Boolean(cachedPayment?.appointment_id),
  });

  try {
    await completePayment(params.payment_id, {
      payment_method,
      gcash_reference_number: formData.get("gcash_reference_number"),
      cash_received: formData.get("cash_received"),
      gcash_received: formData.get("gcash_received"),
    });
  } catch (error) {
    // Roll back the optimistic updates — the payment is still Pending.
    previousPaymentsQueries.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
    rollbackRevenue();

    const errorMessage = error.message || "Failed to complete payment.";

    toast.error("Failed to complete payment", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return { error: errorMessage };
  }

  await queryClient.invalidateQueries({ queryKey: ["Payments"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayPayments"] });
  await queryClient.invalidateQueries({ queryKey: ["RevenueSummary"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayRevenueSummary"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayRevenueTransactions"] });
  await queryClient.invalidateQueries({ queryKey: ["appointment"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayAppointments"] });
  await invalidateAppointmentQueries();

  toast.success("Payment completed", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: "The order has been marked as paid.",
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2000,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect(cameFromDashboard ? "/dashboard" : `../${referrerSearch}`);
}
