// Optimistic updates: change the cached lists on screen immediately, undo
// if the server refuses, and refetch afterwards so the screen ends up
// exactly matching the server either way.
//
// Used for predictable actions (delete, restore, status changes, edits).
// NOT used where the server decides the outcome — booking (slot conflicts,
// pricing), payments/checkout (amounts, stock, deposit vs full), verifying
// GCash, adding records (the server assigns the id) — showing "success"
// first there would sometimes be wrong.
import { queryClient } from "./http.js";
import { applyToRows, removeWhere, patchWhere } from "../utils/applyToRows.js";

// Every appointment list (calendar, service pages, Dashboard queue).
export const APPOINTMENT_LIST_KEYS = [
  ["appointments"],
  ["consultation-appointments"],
  ["grooming-appointments"],
  ["operation-appointments"],
  ["TodayAppointments"],
  ["TodayQueue"],
];

// Patch every cached query under each key now; returns undo().
export function patchCachedRows(keys, update) {
  const snapshots = keys.flatMap((queryKey) => queryClient.getQueriesData({ queryKey }));
  keys.forEach((queryKey) =>
    queryClient.setQueriesData({ queryKey }, (old) => applyToRows(old, update)),
  );
  return () => snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

const refetch = (keys) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

// For router actions / plain handlers: patch now, send `request` in the
// background, undo + onError(error) if it fails, refetch when it settles.
// Returns the request promise (callers usually don't await it).
export function runOptimistic({ keys, update, request, refresh = [], onSuccess, onError }) {
  const undo = patchCachedRows(keys, update);
  return request()
    .then(onSuccess)
    .catch((error) => {
      undo();
      onError?.(error);
    })
    .finally(() => refetch([...keys, ...refresh]));
}

// For useMutation: spread into the options. `update(row, variables)`.
// The page's own onMutate/onSuccess/onError run too (e.g. close a confirm
// dialog right away in onMutate, toast in onSuccess/onError).
export function optimisticMutation({ keys, update, refresh = [], onMutate, onSuccess, onError }) {
  return {
    onMutate: (variables) => {
      onMutate?.(variables);
      return { undo: patchCachedRows(keys, (row) => update(row, variables)) };
    },
    onSuccess,
    onError: (error, variables, context) => {
      context?.undo?.();
      onError?.(error, variables);
    },
    onSettled: () => refetch([...keys, ...refresh]),
  };
}

// Row helpers (match by id field, then patch or remove), re-exported so
// pages import everything optimistic from this one module.
export { removeWhere, patchWhere };
