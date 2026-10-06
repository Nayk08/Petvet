import { test } from "node:test";
import assert from "node:assert/strict";
import { minDeposit, depositError, isFullAmount, balanceDue } from "./deposit.js";

test("minimum deposit is 50%, rounded up to the centavo", () => {
  assert.equal(minDeposit(500), 250);
  assert.equal(minDeposit("333.33"), 166.67);
  assert.equal(minDeposit("0.01"), 0.01);
});

test("only the 50% reservation fee or the full total is accepted", () => {
  assert.equal(depositError(500, 250), null);
  assert.equal(depositError(500, "500.00"), null);
  assert.equal(depositError("333.33", "166.67"), null);
  assert.match(depositError("333.33", "166.66"), /₱166\.67 reservation fee/);
  assert.match(depositError(500, 300), /either/); // in between: no longer allowed
  assert.match(depositError(500, 500.01), /either/);
  assert.match(depositError(500, 0), /Choose/);
  assert.match(depositError(500, "abc"), /Choose/);
});

test("full vs partial, and the balance left", () => {
  assert.equal(isFullAmount("500.00", 500), true);
  assert.equal(isFullAmount(500, 250), false);
  assert.equal(balanceDue("580.00", "290.00"), 290);
  assert.equal(balanceDue("333.33", "166.67"), 166.66);
  assert.equal(balanceDue(500, null), 500);
});
