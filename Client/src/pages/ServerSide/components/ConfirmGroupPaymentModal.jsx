import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
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
import PaymentMethodPicker from "@/components/ui/PaymentMethodPicker.jsx";
import {
  queryClient,
  invalidateAppointmentQueries,
  fetchBookingGroup,
  completeGroupPayment,
} from "@/api/http";
import { evaluatePaymentAmount, requiresExactAmount } from "@/utils/paymentValidation.js";
import { formatDate } from "@/utils/COLUMNS";

// "2026-10-15 16:30:00" -> "4:30 PM" (plain string parsing: Manila wall clock).
function formatClock(value) {
  const [h, m] = String(value ?? "").split(" ")[1]?.split(":").map(Number) ?? [];
  if (h == null || Number.isNaN(h)) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const peso = (n) => `₱${Number(n).toFixed(2)}`;

// One counter payment (Cash / GCash / Split) for every item of a booking made
// together in the Book Appointment window. The server spreads it over the
// items' bills (cash first for Split) — see completeGroupPayment.
// ponytail: no combined printable receipt; each item's receipt prints from Payments.
export function Component() {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingGroup = location.state?.bookingGroup;
  const clientName = location.state?.clientName;

  const { data: rows, isPending, isError, error } = useQuery({
    queryKey: ["booking-group", bookingGroup],
    queryFn: ({ signal }) => fetchBookingGroup(bookingGroup, { signal }),
    enabled: Boolean(bookingGroup),
    staleTime: 0,
  });

  const unpaid = (rows ?? []).filter(
    (r) => r.payment_status_name === "Pending" && r.appointment_status_name === "Pending",
  );
  // Items with no fixed price (0 on the bill) are priced here.
  const [amounts, setAmounts] = useState({});
  const priceOf = (r) =>
    Number(r.total_amount) > 0 ? Number(r.total_amount) : Number(amounts[r.appointment_id] || 0);
  const total = Math.round(unpaid.reduce((sum, r) => sum + priceOf(r), 0) * 100) / 100;
  const allPriced = unpaid.every((r) => priceOf(r) > 0);

  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const isSplit = paymentMethod === "Split";
  const [amountReceived, setAmountReceived] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [gcashReceived, setGcashReceived] = useState("");
  const received = isSplit
    ? (parseFloat(cashReceived) || 0) + (parseFloat(gcashReceived) || 0)
    : parseFloat(amountReceived);
  const hasInput = isSplit ? cashReceived !== "" || gcashReceived !== "" : amountReceived !== "";
  const { isValid, change } = hasInput
    ? evaluatePaymentAmount({ paymentMethod, receivedTotal: received, total })
    : { isValid: false, change: 0 };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);

  const backToCalendar = () => navigate(`..${location.search}`);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await completeGroupPayment(bookingGroup, {
        payment_method: paymentMethod,
        gcash_reference_number: form.get("gcash_reference_number") || undefined,
        ...(isSplit ? { cash_received: cashReceived, gcash_received: gcashReceived } : {}),
        amounts: Object.fromEntries(
          unpaid.filter((r) => !(Number(r.total_amount) > 0)).map((r) => [r.appointment_id, priceOf(r)]),
        ),
      });
      await invalidateAppointmentQueries();
      await Promise.all(
        [
          ["TodayAppointments"],
          ["Payments"],
          ["TodayPayments"],
          ["RevenueSummary"],
          ["TodayRevenueSummary"],
          ["TodayRevenueTransactions"],
          ["booking-group", bookingGroup],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      toast.success("Appointments booked", {
        description: `Payment received for ${unpaid.length} appointments.`,
      });
      setDone(true);
    } catch (err) {
      setSubmitError(err.message || "Failed to complete the payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!bookingGroup) {
    return (
      <Dialog open onOpenChange={(open) => !open && backToCalendar()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Booking session expired</DialogTitle>
            <DialogDescription>
              We lost track of this payment step (this can happen after a page
              refresh), but the appointments were already saved as Pending on the
              calendar. Collect their payment from the Payments page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={backToCalendar}>Back to calendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && backToCalendar()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md max-h-[95vh] overflow-y-auto shadow-xl rounded-xl p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {done ? "Appointments Booked" : "Confirm Group Payment"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {done
              ? "Payment received. Each appointment's receipt can be printed from Payments."
              : `Collect one payment for ${clientName ? `${clientName}'s` : "this"} booking.`}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading booking...</p>
        ) : isError ? (
          <p className="text-sm text-rose-500">{error?.message ?? "Failed to load the booking."}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* The items */}
            <ul className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
              {(rows ?? []).map((r) => {
                const isUnpaid = unpaid.includes(r);
                const needsPrice = isUnpaid && !(Number(r.total_amount) > 0);
                return (
                  <li key={r.appointment_id} className="p-3 text-sm space-y-1.5">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {r.pets_name} · {r.service_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(r.appointment_date)}, {formatClock(r.start_time)} –{" "}
                          {formatClock(r.end_time)}
                          {r.staff_name ? ` · ${r.staff_name}` : ""}
                        </p>
                        <p className="text-[11px] text-slate-400">{r.control_number}</p>
                      </div>
                      <span className="font-semibold whitespace-nowrap">
                        {!isUnpaid
                          ? r.payment_status_name
                          : needsPrice
                            ? ""
                            : peso(r.total_amount)}
                      </span>
                    </div>
                    {needsPrice && !done && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 text-sm">₱</span>
                        <Input
                          type="number"
                          min={0.01}
                          step="0.01"
                          required
                          inputMode="decimal"
                          placeholder={`Agreed amount for ${r.service_name}`}
                          value={amounts[r.appointment_id] ?? ""}
                          onChange={(e) =>
                            setAmounts((a) => ({ ...a, [r.appointment_id]: e.target.value }))
                          }
                          className="bg-white dark:bg-slate-900 h-9"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {done ? (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <Button type="button" onClick={backToCalendar}>
                  Done
                </Button>
              </div>
            ) : unpaid.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nothing left to pay for this booking.
              </p>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Total ({unpaid.length} appointments)
                  </span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
                    {peso(total)}
                  </span>
                </div>

                <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />

                {isSplit ? (
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                    {[
                      ["Cash received", cashReceived, setCashReceived],
                      ["GCash received", gcashReceived, setGcashReceived],
                    ].map(([label, value, setValue]) => (
                      <label key={label} className="flex items-center justify-between gap-4 pt-2 text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{label}</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          className="w-36 text-right bg-white dark:bg-slate-950"
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <label className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-sm">
                    <span className="text-slate-700 dark:text-slate-300">Amount received</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-36 text-right bg-white dark:bg-slate-950"
                    />
                  </label>
                )}

                {hasInput && !isValid && allPriced && (
                  <p className="text-xs text-amber-500 text-right">
                    {requiresExactAmount(paymentMethod)
                      ? `Amount received must exactly equal ${peso(total)} — GCash doesn't give change`
                      : `Amount received must be at least ${peso(total)}`}
                  </p>
                )}
                <div className="flex justify-between items-center font-bold text-sm">
                  <span className="text-slate-700 dark:text-slate-300">Change</span>
                  <span className="text-indigo-700 dark:text-indigo-400">{peso(change)}</span>
                </div>

                {submitError && (
                  <p className="text-xs rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-2">
                    {submitError}
                  </p>
                )}

                <DialogFooter className="pt-2 sm:space-x-2">
                  <Button type="button" variant="ghost" onClick={backToCalendar} disabled={isSubmitting}>
                    Pay later
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !allPriced || !isValid}>
                    {isSubmitting ? "Saving..." : "Confirm & Book"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
