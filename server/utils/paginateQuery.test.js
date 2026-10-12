import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePaging } from "./paginateQuery.js";

test("normalizePaging clamps bad query-string values", () => {
  assert.deepEqual(normalizePaging("-1", "10"), { isAll: false, limit: 10, page: 1 });
  assert.deepEqual(normalizePaging("2", "abc"), { isAll: false, limit: 10, page: 2 });
  assert.deepEqual(normalizePaging("0", "0"), { isAll: false, limit: 10, page: 1 });
  assert.deepEqual(normalizePaging("3", "50"), { isAll: false, limit: 50, page: 3 });
  assert.deepEqual(normalizePaging("1", "100000"), { isAll: false, limit: 1000, page: 1 });
  assert.deepEqual(normalizePaging("1", "all"), { isAll: true, limit: null, page: 1 });
  assert.deepEqual(normalizePaging(undefined, undefined), { isAll: false, limit: 10, page: 1 });
});
