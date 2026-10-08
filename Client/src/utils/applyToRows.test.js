import { test } from "node:test";
import assert from "node:assert/strict";
import { applyToRows, removeWhere, patchWhere } from "./applyToRows.js";

const page = {
  rows: [{ client_id: 1, name: "Ana" }, { client_id: 2, name: "Ben" }],
  pagination: { page: 1, total: 12, totalPages: 2 },
};

test("removes a row from a paginated list and lowers the total", () => {
  const out = applyToRows(page, removeWhere("client_id", "2")); // id from a URL is a string
  assert.deepEqual(out.rows.map((r) => r.client_id), [1]);
  assert.equal(out.pagination.total, 11);
  assert.equal(page.rows.length, 2, "the cached original is not mutated (undo needs it)");
});

test("patches a matching row only", () => {
  const out = applyToRows(page, patchWhere("client_id", 1, { name: "Anna" }));
  assert.equal(out.rows[0].name, "Anna");
  assert.equal(out.rows[1], page.rows[1]);
  assert.equal(out.pagination.total, 12, "total unchanged when nothing is removed");
});

test("works on plain arrays and leaves other shapes alone", () => {
  assert.deepEqual(applyToRows([{ id: 1 }, { id: 2 }], removeWhere("id", 1)), [{ id: 2 }]);
  assert.equal(applyToRows(undefined, removeWhere("id", 1)), undefined);
  const single = { clinic_address: "x" };
  assert.equal(applyToRows(single, removeWhere("id", 1)), single);
});
