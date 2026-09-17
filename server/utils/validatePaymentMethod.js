const VALID_METHODS = ["Cash", "GCash", "Split"];

// GCash transaction reference numbers are always a 13-digit numeric code
// (as shown on GCash's own payment confirmation screen).
export const GCASH_REFERENCE_PATTERN = /^\d{13}$/;

// Shared between cart-checkout completion and appointment booking — both
// collect the same payment_method/gcash_reference_number pair and enforce
// the same rule: GCash and Split both move money through GCash, so both
// need a reference number to reconcile against.
export function validatePaymentMethod({ payment_method, gcash_reference_number }) {
  if (!VALID_METHODS.includes(payment_method)) {
    const err = new Error(
      `Invalid payment method. Must be one of: ${VALID_METHODS.join(", ")}`,
    );
    err.statusCode = 400;
    throw err;
  }

  const needsReference = payment_method === "GCash" || payment_method === "Split";
  if (needsReference) {
    const reference = gcash_reference_number?.trim();
    if (!reference) {
      const err = new Error(
        `A GCash reference number is required for ${payment_method} payments.`,
      );
      err.statusCode = 400;
      throw err;
    }
    if (!GCASH_REFERENCE_PATTERN.test(reference)) {
      const err = new Error(
        "GCash reference number must be exactly 13 digits.",
      );
      err.statusCode = 400;
      throw err;
    }
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// How much of total_amount was actually covered by cash vs. GCash. GCash
// never gives change, so GCash and Split must land on the total exactly —
// only Cash can overshoot and hand back change. For a plain Cash/GCash
// payment there's only one method, so the split is trivial.
export function resolvePaymentSplit({
  payment_method,
  total_amount,
  cash_received,
  gcash_received,
}) {
  const total = round2(Number(total_amount));

  if (payment_method === "Cash") {
    return { cash_amount: total, gcash_amount: 0 };
  }
  if (payment_method === "GCash") {
    return { cash_amount: 0, gcash_amount: total };
  }

  // Split
  const cash = round2(Number(cash_received) || 0);
  const gcash = round2(Number(gcash_received) || 0);
  if (round2(cash + gcash) !== total) {
    const err = new Error(
      "Cash + GCash received must exactly equal the total amount for a split payment — GCash doesn't give change.",
    );
    err.statusCode = 400;
    throw err;
  }

  return { cash_amount: cash, gcash_amount: gcash };
}
