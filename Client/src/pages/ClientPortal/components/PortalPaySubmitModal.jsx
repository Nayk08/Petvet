import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
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
  fetchClinicQrCode,
  submitPaymentProof,
  submitGroupPaymentProof,
} from "@/api/clientPortal.js";

const GCASH_REFERENCE_PATTERN = /^\d{13}$/;

// "YYYY-MM-DD HH:mm:ss" Manila wall-clock -> "9:30 AM" (plain string
// parsing; new Date() would shift it into the browser's timezone).
function formatClock(value) {
  if (!value) return "";
  const [h, m] = String(value).split(" ")[1].split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function formatVisitDate(value) {
  if (!value) return "";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// onClose(submitted): true once the proof was sent, false if the client
// backed out without paying (the booking page then asks to cancel it).
// `details`: { pets_name, service_name, staff_name, appointment_date,
// start_time, end_time } — what this bill is for.
// `closeLabel`: the back-out button's text ("Cancel booking" right after booking).
// `createdAt`: when the bill was created — an unpaid online booking is
// cancelled UNPAID_HOLD_MINUTES later (server: expireUnpaidOnlineBookings).
// `group`: a multi-item booking paid in ONE GCash payment —
// { bookingGroup, reservationFee, items: [details + total_amount] }. Then
// `amount` is the group total and paymentId/details aren't used.
const UNPAID_HOLD_MINUTES = 10;

function useSecondsLeft(createdAt) {
  const deadline = createdAt ? new Date(createdAt).getTime() + UNPAID_HOLD_MINUTES * 60_000 : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : null;
}

export default function PortalPaySubmitModal({
  paymentId,
  amount,
  details,
  onClose,
  closeLabel = "Close",
  createdAt,
  group,
}) {
  const secondsLeft = useSecondsLeft(createdAt);
  const isExpired = secondsLeft === 0;
  const queryClient = useQueryClient();
  const [referenceNumber, setReferenceNumber] = useState("");
  // "reservation" (50%) or "full" — fixed amounts, nothing to type.
  const [payOption, setPayOption] = useState("reservation");
  const [proofFile, setProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: qrCode, isPending: isQrPending } = useQuery({
    queryKey: ["clientPortal", "gcash-qr-code"],
    queryFn: ({ signal }) => fetchClinicQrCode({ signal }),
    staleTime: 1000 * 60 * 10,
  });

  const isReferenceValid = GCASH_REFERENCE_PATTERN.test(referenceNumber);
  // Reservation fee = 50% rounded up to the centavo, or the full bill.
  // Mirrors server/utils/deposit.js, which accepts only these two amounts.
  // A group's fee is each item's 50% added up (computed by the server).
  const toCents = (v) => Math.round(Number(v) * 100);
  const reservationFee = group
    ? Number(group.reservationFee)
    : Math.ceil(toCents(amount ?? 0) * 0.5) / 100;
  const fullAmount = Number(amount ?? 0);
  const amountToPay = payOption === "full" ? fullAmount : reservationFee;
  const balanceLeft = Math.round((fullAmount - amountToPay) * 100) / 100;
  const canSubmit = isReferenceValid && amount != null && Boolean(proofFile) && !isExpired;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("gcash_reference_number", referenceNumber);
      formData.append("amount_paid", amountToPay.toFixed(2));
      formData.append("payment_proof_image", proofFile);
      if (group) await submitGroupPaymentProof(group.bookingGroup, formData);
      else await submitPaymentProof(paymentId, formData);
      await queryClient.invalidateQueries({ queryKey: ["clientPortal", "payments"] });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to submit payment proof.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose(submitted)}>
      {/* Scrolls inside on short screens (laptops, phones): the QR, fields and
          buttons are taller than the viewport. */}
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay via GCash</DialogTitle>
          <DialogDescription>
            {submitted
              ? "Your payment is now awaiting staff verification."
              : "Pay the reservation fee (50%) or the full amount to confirm your booking. Scan the QR code, then submit your reference number and a screenshot."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We'll confirm it once staff verifies your reference number.
            </p>
            <Button onClick={() => onClose(true)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {secondsLeft != null && (
              <div
                role="status"
                className={`rounded-lg px-3 py-2 text-xs font-medium border ${
                  isExpired
                    ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                    : secondsLeft <= 120
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                }`}
              >
                {isExpired
                  ? "Time's up — this booking was cancelled and the slot released. Please book again. If you already sent money by GCash, contact the clinic with your reference number."
                  : `Submit your payment within ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")} or this booking is cancelled.`}
              </div>
            )}
            {/* What this bill is for */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-1.5 text-sm">
              {group?.items.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-1.5 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900 dark:text-slate-100">
                      {item.pets_name} · {item.service_name}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {formatVisitDate(item.appointment_date)}, {formatClock(item.start_time)} –{" "}
                      {formatClock(item.end_time)}
                      {item.staff_name ? ` · ${item.staff_name}` : ""}
                    </span>
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    ₱{Number(item.total_amount).toFixed(2)}
                  </span>
                </div>
              ))}
              {!group && [
                ["Pet", details?.pets_name],
                ["Service", details?.service_name],
                ["Staff", details?.staff_name],
                ["Date", formatVisitDate(details?.appointment_date)],
                [
                  "Time",
                  details?.start_time &&
                    `${formatClock(details.start_time)} – ${formatClock(details.end_time)}`,
                ],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                      {value}
                    </span>
                  </div>
                ))}
              {amount != null && (
                <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Total
                  </span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
                    ₱{Number(amount).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* How much to send — fixed amounts, nothing to type. */}
            {amount != null && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Choose how much to pay now
                </p>
                <div role="radiogroup" className="grid grid-cols-2 gap-2">
                  {[
                    ["reservation", "Reservation fee (50%)", reservationFee],
                    ["full", "Full payment", fullAmount],
                  ].map(([value, label, price]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={payOption === value}
                      onClick={() => setPayOption(value)}
                      className={`rounded-lg border px-2 py-2 text-left transition-colors cursor-pointer ${
                        payOption === value
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="block text-xs">{label}</span>
                      <span className="block text-base font-bold">₱{price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Send exactly <strong>₱{amountToPay.toFixed(2)}</strong> to the QR code below.
                  {balanceLeft > 0 && ` The remaining ₱${balanceLeft.toFixed(2)} is paid at the clinic.`}
                </p>
                <p className="text-xs font-medium rounded-md px-2.5 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  The reservation fee is non-refundable if you don't show up for your appointment.
                </p>
              </div>
            )}

            <div className="flex justify-center">
              {isQrPending ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Loading QR code...
                </p>
              ) : qrCode?.gcash_qr_code_url ? (
                <img
                  src={qrCode.gcash_qr_code_url}
                  alt="Clinic GCash QR code"
                  className="w-48 h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <p className="text-sm text-rose-500 dark:text-rose-400 text-center">
                  No QR code has been set up yet — please contact the clinic.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                GCash Reference Number
              </label>
              <Input
                value={referenceNumber}
                // Digits only: letters, spaces and dashes (e.g. from a pasted
                // "1234 567 890123") are dropped as they're typed.
                onChange={(e) => setReferenceNumber(e.target.value.replace(/\D/g, "").slice(0, 13))}
                placeholder="13-digit reference number"
                maxLength={13}
                inputMode="numeric"
                pattern="\d{13}"
                title="Enter the 13-digit GCash reference number (numbers only)"
                className="text-slate-900 dark:text-slate-100"
              />
              {referenceNumber && !isReferenceValid && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Must be exactly 13 digits.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Payment Screenshot
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onClose(false)}>
                {closeLabel}
              </Button>
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Proof"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
