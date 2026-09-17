// GCash never gives change, so GCash and Split payments must land on the
// total exactly — Cash keeps the usual "received >= total" + change.
const EPSILON = 0.005;

export function requiresExactAmount(paymentMethod) {
  return paymentMethod === "GCash" || paymentMethod === "Split";
}

export function evaluatePaymentAmount({ paymentMethod, receivedTotal, total }) {
  if (isNaN(receivedTotal)) return { isValid: false, change: 0 };

  if (requiresExactAmount(paymentMethod)) {
    const isValid = Math.abs(receivedTotal - total) < EPSILON;
    return { isValid, change: 0 };
  }

  const isValid = receivedTotal >= total;
  return { isValid, change: isValid ? receivedTotal - total : 0 };
}
