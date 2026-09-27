import { useEffect, useState } from "react";
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
  useNavigate,
  useLocation,
  useSubmit,
  useNavigation,
  useActionData,
  redirect,
} from "react-router-dom";
import {
  queryClient,
  invalidateAppointmentQueries,
  completeAppointmentPayment,
  selectGroomingPriceTiers,
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
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// FIXED: was `new Date(isoString).toLocaleTimeString(...)`. draft.payload.start_time
// is now a bare "HH:mm:ss" time-of-day string (see AppointmentFormModal.jsx's
// buildAppointmentPayload — it no longer sends a combined "<date>T<time>"
// datetime string), so wrapping it in `new Date(...)` here would produce
// "Invalid Date". Plain string parsing keeps the AM/PM display, with no
// Date object and no timezone conversion involved anywhere in the path.
function formatTimeLabel(timeString) {
  if (!timeString) return "";
  const [hStr, mStr] = timeString.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${period}`;
}

function resolveGroomingTier(tiers, weightKg) {
  if (!tiers?.length || weightKg == null) return null;
  const sorted = [...tiers].sort((a, b) => {
    if (a.max_weight_kg == null) return 1;
    if (b.max_weight_kg == null) return -1;
    return a.max_weight_kg - b.max_weight_kg;
  });
  return (
    sorted.find(
      (t) =>
        t.max_weight_kg == null || Number(t.max_weight_kg) >= Number(weightKg),
    ) ?? null
  );
}

export function Component() {
  const navigate = useNavigate();
  const location = useLocation();
  const submit = useSubmit();
  const { state: navState } = useNavigation();
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;

  const draft = location.state;

  const isGrooming = draft?.serviceName === "Grooming";

  const { data: tiers } = useQuery({
    queryKey: ["grooming-price-tiers"],
    queryFn: ({ signal }) => selectGroomingPriceTiers({ signal }),
    enabled: isGrooming,
  });

  const resolvedTier = isGrooming
    ? resolveGroomingTier(tiers, draft?.petWeightKg)
    : null;

  const isFixedPrice = draft?.servicePrice != null;
  const isVariablePrice = !isFixedPrice && !isGrooming; // Operation

  const [manualAmount, setManualAmount] = useState("");
  const total = isFixedPrice
    ? Number(draft.servicePrice)
    : isGrooming
      ? Number(resolvedTier?.price ?? 0)
      : Number(manualAmount || 0);

  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const isSplit = paymentMethod === "Split";

  const [amountReceived, setAmountReceived] = useState("");
  const [splitCashReceived, setSplitCashReceived] = useState("");
  const [splitGcashReceived, setSplitGcashReceived] = useState("");
  const [hasValidPayment, setHasValidPayment] = useState(false);
  const [change, setChange] = useState(0);

  useEffect(() => {
    const hasAnyInput = isSplit
      ? splitCashReceived !== "" || splitGcashReceived !== ""
      : amountReceived !== "";

    if (!hasAnyInput || !(total > 0)) {
      setHasValidPayment(false);
      setChange(0);
      return;
    }

    const received = isSplit
      ? (parseFloat(splitCashReceived) || 0) +
        (parseFloat(splitGcashReceived) || 0)
      : parseFloat(amountReceived);

    const { isValid, change: computedChange } = evaluatePaymentAmount({
      paymentMethod,
      receivedTotal: received,
      total,
    });
    setHasValidPayment(isValid);
    setChange(computedChange);
  }, [
    amountReceived,
    splitCashReceived,
    splitGcashReceived,
    isSplit,
    paymentMethod,
    total,
  ]);

  function closeModal() {
    navigate(`../add-appointment${location.search}`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    submit(event.currentTarget, { method: "post" });
  }

  if (!draft?.appointmentId) {
    return (
      <Dialog
        open
        onOpenChange={(isOpen) => !isOpen && navigate(`..${location.search}`)}
      >
        <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-sm shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              Booking session expired
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              We lost track of this payment step (this can happen after a page
              refresh) — but the appointment was already saved as Pending on the
              calendar. Payment collection for it isn't available from here
              right now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button onClick={() => navigate(`..${location.search}`)}>
              Back to calendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-xl rounded-xl overflow-hidden p-6 transition-colors duration-200">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Confirm Payment
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Collect payment to complete this booking.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="hidden"
            name="appointment_id"
            value={draft.appointmentId}
          />
          {/* Grooming/fixed-price services don't submit an `amount` field
              (the server prices them itself) — this carries the same
              client-computed total purely so the action below can bump
              the revenue cards optimistically without waiting on the
              server's response. */}
          <input type="hidden" name="total_amount_hint" value={total} />

          {/* Summary */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Client</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {draft.clientName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Pet</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {draft.petName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Service
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {draft.serviceName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Staff</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {draft.staffName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Date / Time
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {formatDateLabel(draft.payload.appointment_date)},{" "}
                {formatTimeLabel(draft.payload.start_time)}
              </span>
            </div>
          </div>

          {/* Amount */}
          {isVariablePrice ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Service Amount
              </label>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400 text-sm">
                  ₱
                </span>
                <Input
                  name="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  inputMode="decimal"
                  placeholder="Enter operation cost"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Operations are priced per case — enter the agreed amount.
              </p>
            </div>
          ) : (
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {isGrooming && resolvedTier
                  ? `Total (${resolvedTier.tier_name} tier)`
                  : "Total"}
              </span>
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
                ₱{total.toFixed(2)}
              </span>
            </div>
          )}

          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
          />

          {/* Amount received / change (cashier convenience only) */}
          {isSplit ? (
            <>
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-200 dark:border-slate-800">
                <label
                  htmlFor="amount-received-cash"
                  className="text-sm text-slate-700 dark:text-slate-300 shrink-0 pt-3"
                >
                  Cash received
                </label>
                <div className="flex items-center gap-1 w-36 pt-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    ₱
                  </span>
                  <Input
                    id="amount-received-cash"
                    name="cash_received"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={splitCashReceived}
                    onChange={(e) => setSplitCashReceived(e.target.value)}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="amount-received-gcash"
                  className="text-sm text-slate-700 dark:text-slate-300 shrink-0"
                >
                  GCash received
                </label>
                <div className="flex items-center gap-1 w-36">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    ₱
                  </span>
                  <Input
                    id="amount-received-gcash"
                    name="gcash_received"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={splitGcashReceived}
                    onChange={(e) => setSplitGcashReceived(e.target.value)}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-right"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-200 dark:border-slate-800">
              <label
                htmlFor="amount-received"
                className="text-sm text-slate-700 dark:text-slate-300 shrink-0 pt-3"
              >
                Amount received
              </label>
              <div className="flex items-center gap-1 w-36 pt-3">
                <span className="text-slate-500 dark:text-slate-400 text-sm">
                  ₱
                </span>
                <Input
                  id="amount-received"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-right"
                />
              </div>
            </div>
          )}

          {!hasValidPayment &&
            (isSplit
              ? splitCashReceived !== "" || splitGcashReceived !== ""
              : amountReceived !== "") && (
              <p className="text-xs text-amber-500 dark:text-amber-400 text-right">
                {requiresExactAmount(paymentMethod)
                  ? `Amount received must exactly equal ₱${total.toFixed(2)} — GCash doesn't give change`
                  : `Amount received must be at least ₱${total.toFixed(2)}`}
              </p>
            )}

          <div className="flex justify-between items-center font-bold text-sm">
            <span className="text-slate-700 dark:text-slate-300">Change</span>
            <span className="text-indigo-700 dark:text-indigo-400">
              ₱{change.toFixed(2)}
            </span>
          </div>

          {isActionError && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
              <span className="flex-1">{actionError}</span>
            </div>
          )}

          <DialogFooter className="pt-2 sm:space-x-2">
            {navState !== "submitting" && (
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 rounded-lg"
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                navState === "submitting" || !hasValidPayment || !(total > 0)
              }
              className="disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 font-medium h-10 px-5 rounded-lg transition-colors duration-150 shadow-sm"
            >
              {navState === "submitting" ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Booking...</span>
                </div>
              ) : (
                "Confirm & Book"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export async function action({ request }) {
  const formData = await request.formData();
  const appointment_id = formData.get("appointment_id");
  const amount = formData.get("amount");
  const payment_method = formData.get("payment_method");
  const gcash_reference_number = formData.get("gcash_reference_number");
  const cash_received = formData.get("cash_received");
  const gcash_received = formData.get("gcash_received");
  const totalAmountHint = formData.get("total_amount_hint");

  const { cashAmount, gcashAmount } = estimatePaymentSplit({
    paymentMethod: payment_method,
    totalAmount: amount || totalAmountHint,
    cashReceived: cash_received,
    gcashReceived: gcash_received,
  });
  const rollbackRevenue = applyOptimisticRevenue({
    cashAmount,
    gcashAmount,
    totalAmount: amount || totalAmountHint,
    isAppointment: true,
  });

  try {
    await completeAppointmentPayment(appointment_id, {
      ...(amount ? { amount } : {}),
      payment_method,
      gcash_reference_number,
      cash_received,
      gcash_received,
    });
  } catch (error) {
    rollbackRevenue();
    const errorMessage = error.message || "Failed to book appointment.";

    toast.error("Failed to book appointment", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return { error: errorMessage };
  }

  await invalidateAppointmentQueries();
  await queryClient.invalidateQueries({ queryKey: ["TodayAppointments"] });
  await queryClient.invalidateQueries({ queryKey: ["Payments"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayPayments"] });
  await queryClient.invalidateQueries({ queryKey: ["RevenueSummary"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayRevenueSummary"] });
  await queryClient.invalidateQueries({
    queryKey: ["TodayRevenueTransactions"],
  });

  toast.success("Appointment booked", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: "Payment received and appointment booked successfully.",
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2000,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect("../");
}
