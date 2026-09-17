import { useState } from "react";
import { Input } from "@/components/ui/input.jsx";

const METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "GCash", label: "GCash" },
  { value: "Split", label: "Split (Cash + GCash)" },
];

// GCash transaction reference numbers are always a 13-digit numeric code
// (as shown on GCash's own payment confirmation screen) — mirrors
// GCASH_REFERENCE_PATTERN in server/utils/validatePaymentMethod.js.
const GCASH_REFERENCE_LENGTH = 13;

export default function PaymentMethodPicker({
  value,
  onChange,
  defaultValue = "Cash",
}) {
  // Falls back to owning its own state when the parent doesn't need to
  // react to the selection — pass `value`/`onChange` to make it controlled.
  const [internalMethod, setInternalMethod] = useState(defaultValue);
  const method = value ?? internalMethod;
  const setMethod = onChange ?? setInternalMethod;

  const [reference, setReference] = useState("");
  const needsReference = method === "GCash" || method === "Split";
  const isReferenceValid = reference.length === GCASH_REFERENCE_LENGTH;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
        Payment Method
      </label>
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <label
            key={m.value}
            className={`flex items-center justify-center text-center h-10 rounded-lg border text-xs font-medium cursor-pointer transition-colors px-1 ${
              method === m.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <input
              type="radio"
              name="payment_method"
              value={m.value}
              checked={method === m.value}
              onChange={() => setMethod(m.value)}
              className="sr-only"
            />
            {m.label}
          </label>
        ))}
      </div>

      {needsReference && (
        <div className="pt-1.5 space-y-1">
          <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            GCash Reference Number
          </label>
          <Input
            name="gcash_reference_number"
            type="text"
            inputMode="numeric"
            required
            maxLength={GCASH_REFERENCE_LENGTH}
            pattern={`\\d{${GCASH_REFERENCE_LENGTH}}`}
            title="Enter the 13-digit GCash reference number"
            placeholder="e.g. 0123456789012"
            value={reference}
            onChange={(e) =>
              setReference(
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, GCASH_REFERENCE_LENGTH),
              )
            }
            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono tracking-wide"
          />
          <p
            className={`text-[11px] ${
              reference && !isReferenceValid
                ? "text-amber-500 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {reference && !isReferenceValid
              ? `Must be exactly ${GCASH_REFERENCE_LENGTH} digits (${reference.length}/${GCASH_REFERENCE_LENGTH})`
              : `${GCASH_REFERENCE_LENGTH}-digit GCash reference number`}
          </p>
        </div>
      )}
    </div>
  );
}
