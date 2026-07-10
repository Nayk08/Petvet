// hooks/usePagination.js
import { useSearchParams } from "react-router-dom";

export function usePagination({ defaultLimit = 10 } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const rawLimit = searchParams.get("limit");
  const limit = rawLimit === "all" ? "all" : parseInt(rawLimit) || defaultLimit;

  const setPage = (newPage) => {
    setSearchParams((prev) => {
      prev.set("page", String(newPage));
      return prev;
    });
  };

  const setLimit = (newLimit) => {
    setSearchParams((prev) => {
      prev.set("limit", String(newLimit));
      prev.set("page", "1");
      return prev;
    });
  };

  return { page, limit, setPage, setLimit };
}
