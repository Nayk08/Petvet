import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateGroupPayment } from "./validatePaymentMethod.js";

test("split: cash fills bills in order, GCash covers the rest", () => {
  assert.deepEqual(
    allocateGroupPayment({ payment_method: "Split", totals: [400, 600], cash_received: 500, gcash_received: 500 }),
    [
      { payment_method: "Cash", cash_received: 400, gcash_received: 0 },
      { payment_method: "Split", cash_received: 100, gcash_received: 500 },
    ],
  );
});

test("cash or GCash only applies to every bill", () => {
  const cash = allocateGroupPayment({ payment_method: "Cash", totals: [250, 300.5] });
  assert.deepEqual(cash.map((b) => b.payment_method), ["Cash", "Cash"]);
  const gcash = allocateGroupPayment({ payment_method: "GCash", totals: [250, 300.5] });
  assert.deepEqual(gcash.map((b) => [b.payment_method, b.gcash_received]), [["GCash", 250], ["GCash", 300.5]]);
});

test("split amounts must add up to the group total", () => {
  assert.throws(
    () => allocateGroupPayment({ payment_method: "Split", totals: [400, 600], cash_received: 500, gcash_received: 400 }),
    { statusCode: 400 },
  );
});
