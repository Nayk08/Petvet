import { test } from "node:test";
import assert from "node:assert/strict";
import { minDeposit, depositError, isFullAmount, balanceDue } from "./deposit.js";

test("minimum deposit is 50%, rounded up to the centavo", () => {
  assert.equal(minDeposit(500), 250);
  assert.equal(minDeposit("333.33"), 166.67);
  assert.equal(minDeposit("0.01"), 0.01);
});

test("deposit must be between 50% and the full total", () => {
  assert.equal(depositError(500, 250), null);
  assert.equal(depositError(500, 500), null);
  assert.equal(depositError("333.33", "166.67"), null);
  assert.match(depositError("333.33", "166.66"), /at least ₱166\.67/);
  assert.match(depositError(500, 249.99), /at least ₱250\.00/);
  assert.match(depositError(500, 500.01), /can't be more/);
  assert.match(depositError(500, 0), /Enter the amount/);
  assert.match(depositError(500, "abc"), /Enter the amount/);
});

test("full vs partial, and the balance left", () => {
  assert.equal(isFullAmount("500.00", 500), true);
  assert.equal(isFullAmount(500, 250), false);
  assert.equal(balanceDue("580.00", "290.00"), 290);
  assert.equal(balanceDue("333.33", "166.67"), 166.66);
  assert.equal(balanceDue(500, null), 500);
});
