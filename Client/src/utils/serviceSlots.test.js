// Run: node --test src/utils/   (node's built-in runner, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildServiceSlots,
  overlapsBooked,
  toBookedRanges,
  dayClosedReason,
  staffOnDuty,
} from "./serviceSlots.js";

test("clinic rules: consultation cutoff, no grooming Sunday, no vets Wednesday", () => {
  assert.equal(buildServiceSlots(30, 2).at(-1).label, "4:30 PM - 5:00 PM");
  assert.equal(buildServiceSlots(30, 1).at(-1).label, "5:30 PM - 6:00 PM");
  assert.ok(dayClosedReason("2026-10-11", 1)); // Sunday, grooming
  assert.equal(dayClosedReason("2026-10-11", 2), null); // Sunday, consultation ok
  const staff = [{ user_level: "Veterinarian" }, { user_level: "Groomer" }];
  assert.equal(staffOnDuty(staff, "2026-10-14").length, 1); // Wednesday
  assert.equal(staffOnDuty(staff, "2026-10-18").length, 2); // Sunday: vets work
  assert.equal(staffOnDuty(staff, "2026-10-13").length, 2); // Tuesday
});

test("slots step by the sub-service's duration and end by 6:00 PM", () => {
  const halfBath = buildServiceSlots(30);
  assert.equal(halfBath[0].label, "9:00 AM - 9:30 AM");
  assert.equal(halfBath[1].value, "09:30");
  assert.equal(halfBath.at(-1).label, "5:30 PM - 6:00 PM");
  assert.equal(halfBath.length, 18);

  assert.equal(buildServiceSlots(60)[0].label, "9:00 AM - 10:00 AM");
  // 45 min: 9:00, 9:45, … last one must still end by 6 PM
  assert.equal(buildServiceSlots(45).at(-1).label, "5:15 PM - 6:00 PM");
  // 120 min: 9, 11, 1, 3 — a 5 PM start would end at 7 PM
  assert.deepEqual(buildServiceSlots(120).map((s) => s.value), ["09:00", "11:00", "13:00", "15:00"]);
});

test("a slot is booked if it overlaps, not just if the start matches", () => {
  const booked = toBookedRanges([{ start_time: "2026-10-07 09:00:00", end_time: "2026-10-07 10:00:00" }]);
  const [s900, s930, s1000] = buildServiceSlots(30);
  assert.equal(overlapsBooked(s900, booked), true);
  assert.equal(overlapsBooked(s930, booked), true); // inside the 60-min booking
  assert.equal(overlapsBooked(s1000, booked), false); // starts as it ends
});
