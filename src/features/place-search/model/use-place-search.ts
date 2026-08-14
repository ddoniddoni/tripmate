"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { mockPlaceSearchAdapter } from "@/features/place-search/api/mock-place-search-adapter";
import type { PlaceSearchAdapter } from "@/features/place-search/model/place-search-adapter";

type PlaceSearchStatus = "error" | "idle" | "loading" | "success";

type UsePlaceSearchOptions = {
  adapter?: PlaceSearchAdapter;
  debounceMs?: number;
};

type SearchState = {
  query: string;
  results: Awaited<ReturnType<PlaceSearchAdapter["search"]>>;
  status: PlaceSearchStatus;
};

const defaultDebounceMs = 250;

export function usePlaceSearch({
  adapter = mockPlaceSearchAdapter,
  debounceMs = defaultDebounceMs,
}: UsePlaceSearchOptions = {}) {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({
    query: "",
    results: [],
    status: "idle",
  });
  const deferredQuery = useDeferredValue(query.trim());
  const isSearchable = deferredQuery.length >= 2;
  const currentSearchState =
    isSearchable && searchState.query === deferredQuery
      ? searchState
      : { query: deferredQuery, results: [], status: isSearchable ? "loading" : "idle" };

  useEffect(() => {
    if (!isSearchable) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void adapter
        .search(deferredQuery, { signal: controller.signal })
        .then((nextResults) => {
          if (controller.signal.aborted) {
            return;
          }

          setSearchState({ query: deferredQuery, results: nextResults, status: "success" });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || isAbortError(error)) {
            return;
          }

          setSearchState({ query: deferredQuery, results: [], status: "error" });
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [adapter, debounceMs, deferredQuery, isSearchable]);

  return {
    clear: () => setQuery(""),
    query,
    results: currentSearchState.results,
    setQuery,
    status: currentSearchState.status,
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
