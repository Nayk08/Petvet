import { test } from "node:test";
import assert from "node:assert/strict";
import { minDeposit, depositError, isFullAmount, balanceDue } from "./deposit.js";

test("minimum deposit is 10%, rounded up to the centavo", () => {
  assert.equal(minDeposit(500), 50);
  assert.equal(minDeposit("333.33"), 33.34);
  assert.equal(minDeposit("0.01"), 0.01);
  assert.equal(minDeposit("0.70"), 0.07);
  assert.equal(minDeposit(7), 0.7);
});

test("only the 10% reservation fee or the full total is accepted", () => {
  assert.equal(depositError(500, 50), null);
  assert.equal(depositError(500, "500.00"), null);
  assert.equal(depositError("333.33", "33.34"), null);
  assert.match(depositError("333.33", "33.33"), /₱33\.34 reservation fee \(10%\)/);
  assert.match(depositError(500, 250), /either/); // old 50% fee: no longer allowed
  assert.match(depositError(500, 500.01), /either/);
  assert.match(depositError(500, 0), /Choose/);
  assert.match(depositError(500, "abc"), /Choose/);
});

test("full vs partial, and the balance left", () => {
  assert.equal(isFullAmount("500.00", 500), true);
  assert.equal(isFullAmount(500, 50), false);
  assert.equal(balanceDue("580.00", "58.00"), 522);
  assert.equal(balanceDue("333.33", "33.34"), 299.99);
  assert.equal(balanceDue(500, null), 500);
});
