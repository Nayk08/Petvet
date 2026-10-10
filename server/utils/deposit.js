// Online (GCash) deposit rule: a client booking online pays at least 50% of
// the bill up front; the rest is collected at the clinic. All math is done
// in centavos so ₱0.01 rounding can't slip a short payment through.

export const MIN_DEPOSIT_RATIO = 0.5;

const toCents = (v) => Math.round(Number(v) * 100);
const fromCents = (c) => c / 100;

// 50% rounded UP to the centavo: ₱333.33 → ₱166.67, never ₱166.66.
export function minDeposit(total) {
  return fromCents(Math.ceil(toCents(total) * MIN_DEPOSIT_RATIO));
}

// null when OK, otherwise the message to show the client. The portal offers
// exactly two fixed amounts (no typed amount): the 50% reservation fee, or
// the full bill.
export function depositError(total, amountSent) {
  const sent = toCents(amountSent);
  if (!(Number(amountSent) > 0)) return "Choose the reservation fee or full payment.";
  if (sent === toCents(minDeposit(total)) || sent === toCents(total)) return null;
  return `Pay either the ₱${minDeposit(total).toFixed(2)} reservation fee (50%) or the full ₱${Number(total).toFixed(2)}.`;
}

export function isFullAmount(total, amountSent) {
  return toCents(amountSent) === toCents(total);
}

export function balanceDue(total, paid) {
  return fromCents(toCents(total) - toCents(paid ?? 0));
}

// One online payment for a multi-item booking: either every item's 50%
// reservation fee (each rounded like a single booking) or every item in full.
// Returns each bill's share, or { error } when the amount is neither.
export function groupDepositShares(totals, amountSent) {
  const deposits = totals.map((t) => minDeposit(t));
  const sumCents = (list) => list.reduce((s, v) => s + toCents(v), 0);
  const sent = toCents(amountSent);
  if (sent === sumCents(deposits)) return { shares: deposits, full: false };
  if (sent === sumCents(totals)) return { shares: totals.map(Number), full: true };
  return {
    error: `Pay either the ₱${fromCents(sumCents(deposits)).toFixed(2)} reservation fee (50%) or the full ₱${fromCents(sumCents(totals)).toFixed(2)}.`,
  };
}
