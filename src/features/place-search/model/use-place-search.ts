"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { placeSearchApiAdapter } from "@/features/place-search/api/place-search-api-adapter";
import type { PlaceSearchAdapter } from "@/features/place-search/model/place-search-adapter";

type PlaceSearchStatus = "error" | "idle" | "loading" | "success";

type UsePlaceSearchOptions = {
  adapter?: PlaceSearchAdapter;
  debounceMs?: number;
};

type SearchState = {
  errorMessage?: string;
  query: string;
  results: Awaited<ReturnType<PlaceSearchAdapter["search"]>>;
  status: PlaceSearchStatus;
};

const defaultDebounceMs = 250;

export function usePlaceSearch({
  adapter = placeSearchApiAdapter,
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
  const pendingSearchState: SearchState = {
    errorMessage: undefined,
    query: deferredQuery,
    results: [],
    status: isSearchable ? "loading" : "idle",
  };
  const currentSearchState =
    isSearchable && searchState.query === deferredQuery
      ? searchState
      : pendingSearchState;

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

          setSearchState({
            errorMessage: getSearchErrorMessage(error),
            query: deferredQuery,
            results: [],
            status: "error",
          });
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [adapter, debounceMs, deferredQuery, isSearchable]);

  return {
    clear: () => setQuery(""),
    errorMessage: currentSearchState.errorMessage,
    query,
    results: currentSearchState.results,
    setQuery,
    status: currentSearchState.status,
  };
}

function getSearchErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "장소 검색을 완료하지 못했습니다. 다시 시도해 주세요.";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
