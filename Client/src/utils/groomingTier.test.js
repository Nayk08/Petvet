import { test } from "node:test";
import assert from "node:assert/strict";
import { priceForPet, tierPriceRange } from "./groomingTier.js";

// Server returns numerics as strings — keep the test data that way.
const tiers = [
  { tier_name: "Large", max_weight_kg: "32.00", price: "1100.00" },
  { tier_name: "Small", max_weight_kg: "7.00", price: "420.00" },
  { tier_name: "Medium", max_weight_kg: "15.00", price: "580.00" },
];
const grooming = { service_price: "200.00", grooming_tiers: tiers };

test("grooming is priced by the smallest tier that covers the weight", () => {
  assert.equal(priceForPet(grooming, 3).price, "420.00");
  assert.equal(priceForPet(grooming, 7).price, "420.00"); // boundary is inclusive
  assert.equal(priceForPet(grooming, 7.01).price, "580.00");
  assert.equal(priceForPet(grooming, "20").price, "1100.00");
});

test("no weight, or heavier than every tier → priced at the clinic (null)", () => {
  assert.equal(priceForPet(grooming, null).price, null);
  assert.equal(priceForPet(grooming, "").price, null);
  assert.equal(priceForPet(grooming, 40).price, null);
});

test("an unlimited tier (null max) catches the heaviest pets", () => {
  const withXL = { grooming_tiers: [...tiers, { tier_name: "XL", max_weight_kg: null, price: "1500.00" }] };
  assert.equal(priceForPet(withXL, 40).price, "1500.00");
  assert.equal(priceForPet(withXL, 5).price, "420.00");
});

test("other services use their fixed price", () => {
  assert.equal(priceForPet({ service_price: "380.00" }, 10).price, "380.00");
  assert.equal(priceForPet({ service_price: null }, 10).price, null);
});

test("price range for a Grooming card", () => {
  assert.equal(tierPriceRange(tiers), "₱420.00 – ₱1,100.00");
  assert.equal(tierPriceRange([]), null);
});
