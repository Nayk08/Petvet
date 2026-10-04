// hooks/usePagination.js
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function usePagination({ defaultLimit = 10 } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const rawLimit = searchParams.get("limit");
  const limit = rawLimit === "all" ? "all" : parseInt(rawLimit) || defaultLimit;

  // Both setters are no-ops when nothing changes. Every setSearchParams is a
  // navigation, and every navigation re-runs the route loaders (which hit
  // the API) — so pages that "reset to page 1" in an effect used to trigger
  // a navigation even when already on page 1. With an effect that re-ran
  // every render (PortalPets), that became an endless request loop ending
  // in 429 "Too many requests".
  const setPage = useCallback(
    (newPage) => {
      if (String(newPage) === (searchParams.get("page") ?? "1")) return;
      setSearchParams((prev) => {
        prev.set("page", String(newPage));
        return prev;
      });
    },
    [searchParams, setSearchParams],
  );

  const setLimit = useCallback(
    (newLimit) => {
      if (String(newLimit) === String(limit)) return;
      setSearchParams((prev) => {
        prev.set("limit", String(newLimit));
        prev.set("page", "1");
        return prev;
      });
    },
    [limit, setSearchParams],
  );

  return { page, limit, setPage, setLimit };
}
