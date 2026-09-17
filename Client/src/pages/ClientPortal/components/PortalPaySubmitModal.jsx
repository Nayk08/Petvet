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

export default function PortalPaySubmitModal({ paymentId, onClose }) {
  const queryClient = useQueryClient();
  const [referenceNumber, setReferenceNumber] = useState("");
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
  const canSubmit = isReferenceValid && Boolean(proofFile);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("gcash_reference_number", referenceNumber);
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
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay via GCash</DialogTitle>
          <DialogDescription>
            {submitted
              ? "Your payment is now awaiting staff verification."
              : "Scan the QR code, pay the full amount, then submit your reference number and a screenshot."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We'll confirm it once staff verifies your reference number.
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
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
