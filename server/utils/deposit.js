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

// null when OK, otherwise the message to show the client.
export function depositError(total, amountSent) {
  const sent = toCents(amountSent);
  if (!(Number(amountSent) > 0)) return "Enter the amount you sent.";
  if (sent > toCents(total)) {
    return `The amount sent can't be more than the total of ₱${Number(total).toFixed(2)}.`;
  }
  if (sent < toCents(minDeposit(total))) {
    return `Send at least ₱${minDeposit(total).toFixed(2)} (50% of ₱${Number(total).toFixed(2)}). The rest is paid at the clinic.`;
  }
  return null;
}

export function isFullAmount(total, amountSent) {
  return toCents(amountSent) === toCents(total);
}

export function balanceDue(total, paid) {
  return fromCents(toCents(total) - toCents(paid ?? 0));
}
