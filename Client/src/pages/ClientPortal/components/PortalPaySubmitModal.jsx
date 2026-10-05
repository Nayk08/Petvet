import { useState } from "react";
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
import { fetchClinicQrCode, submitPaymentProof } from "@/api/clientPortal.js";

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
// backed out without paying (the booking page then offers to cancel it).
// `details`: { pets_name, service_name, staff_name, appointment_date,
// start_time, end_time } — what this bill is for.
export default function PortalPaySubmitModal({ paymentId, amount, details, onClose }) {
  const queryClient = useQueryClient();
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amountSent, setAmountSent] = useState("");
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
  // At least 50% (rounded up to the centavo) up to the full bill; the rest
  // is paid at the clinic. Mirrors server/utils/deposit.js, which re-checks.
  const toCents = (v) => Math.round(Number(v) * 100);
  const minCents = Math.ceil(toCents(amount ?? 0) * 0.5);
  const sentCents = toCents(amountSent);
  const isAmountValid =
    amountSent !== "" && amount != null && sentCents >= minCents && sentCents <= toCents(amount);
  const balanceLeft = isAmountValid ? (toCents(amount) - sentCents) / 100 : 0;
  const canSubmit = isReferenceValid && isAmountValid && Boolean(proofFile);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("gcash_reference_number", referenceNumber);
      formData.append("amount_paid", amountSent);
      formData.append("payment_proof_image", proofFile);
      await submitPaymentProof(paymentId, formData);
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay via GCash</DialogTitle>
          <DialogDescription>
            {submitted
              ? "Your payment is now awaiting staff verification."
              : "Scan the QR code and pay the full amount or at least 50% now — the rest is paid at the clinic. Then submit your reference number and a screenshot."}
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
            {/* What this bill is for */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-1.5 text-sm">
              {[
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
              {amount != null && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Minimum to pay online (50%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ₱{(minCents / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
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
                onChange={(e) => setReferenceNumber(e.target.value.trim())}
                placeholder="13-digit reference number"
                maxLength={13}
                inputMode="numeric"
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
                Amount Sent (₱)
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={amountSent}
                onChange={(e) => setAmountSent(e.target.value)}
                placeholder={amount != null ? Number(amount).toFixed(2) : "0.00"}
                className="text-slate-900 dark:text-slate-100"
              />
              {amountSent !== "" && !isAmountValid && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Enter the exact amount you sent: at least ₱{(minCents / 100).toFixed(2)} (50%),
                  up to ₱{Number(amount ?? 0).toFixed(2)}.
                </p>
              )}
              {balanceLeft > 0 && (
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                  Partial payment — the remaining ₱{balanceLeft.toFixed(2)} is paid at the clinic.
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
                Pay later
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
