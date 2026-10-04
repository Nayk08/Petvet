// Run: npm test   (node's built-in runner, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { manilaInstant, parseManilaTimestamp } from "./manilaTime.js";
import { resolvePaymentSplit } from "./validatePaymentMethod.js";

test("Manila wall-clock maps to the right instant (UTC+8)", () => {
  const oct4 = new Date("2026-10-04"); // what zod's coerce.date() yields
  assert.equal(manilaInstant(oct4, 10, 0), Date.parse("2026-10-04T02:00:00Z"));
  assert.equal(
    parseManilaTimestamp("2026-10-04 10:00:00"),
    Date.parse("2026-10-04T02:00:00Z"),
  );
});

test("a slot earlier today (Manila) is in the past", () => {
  // 3 PM Manila on Oct 4 = 07:00 UTC; the 10 AM slot must already be past.
  const nowAt3pmManila = Date.parse("2026-10-04T07:00:00Z");
  assert.ok(manilaInstant(new Date("2026-10-04"), 10, 0) < nowAt3pmManila);
  assert.ok(manilaInstant(new Date("2026-10-04"), 16, 0) > nowAt3pmManila);
});

test("split payment must be two positive parts that sum to the total", () => {
  const split = (cash, gcash) =>
    resolvePaymentSplit({
      payment_method: "Split",
      total_amount: 500,
      cash_received: cash,
      gcash_received: gcash,
    });
  assert.deepEqual(split(200, 300), { cash_amount: 200, gcash_amount: 300 });
  assert.throws(() => split(-10, 510), /positive/);
  assert.throws(() => split(0, 500), /positive/);
  assert.throws(() => split(200, 200), /exactly equal/);
});
