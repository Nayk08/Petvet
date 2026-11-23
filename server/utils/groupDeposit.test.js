import { test } from "node:test";
import assert from "node:assert/strict";
import { groupDepositShares } from "./deposit.js";

test("group reservation fee is each item's 10%, rounded per item", () => {
  // 333.33 -> 33.34 (rounded up) and 400 -> 40: fee 73.34
  assert.deepEqual(groupDepositShares([333.33, 400], 73.34), { shares: [33.34, 40], full: false });
});

test("paying the whole group in full", () => {
  assert.deepEqual(groupDepositShares([333.33, 400], 733.33), { shares: [333.33, 400], full: true });
});

test("any other amount is refused", () => {
  assert.match(groupDepositShares([333.33, 400], 500).error, /₱73\.34 .*₱733\.33/);
});
