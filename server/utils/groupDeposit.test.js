import { test } from "node:test";
import assert from "node:assert/strict";
import { groupDepositShares } from "./deposit.js";

test("group reservation fee is each item's 50%, rounded per item", () => {
  // 333.33 -> 166.67 (rounded up) and 400 -> 200: fee 366.67
  assert.deepEqual(groupDepositShares([333.33, 400], 366.67), { shares: [166.67, 200], full: false });
});

test("paying the whole group in full", () => {
  assert.deepEqual(groupDepositShares([333.33, 400], 733.33), { shares: [333.33, 400], full: true });
});

test("any other amount is refused", () => {
  assert.match(groupDepositShares([333.33, 400], 500).error, /₱366\.67 .*₱733\.33/);
});
