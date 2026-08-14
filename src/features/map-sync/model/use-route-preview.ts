"use client";

import { useEffect, useMemo, useState } from "react";

import type { ItineraryItem } from "@/entities/itinerary/model/trip-itinerary";
import { mockDirectionsAdapter } from "@/features/map-sync/api/mock-directions-adapter";
import type {
  DirectionsAdapter,
  DirectionsRoute,
  DirectionsTravelMode,
} from "@/features/map-sync/model/directions-adapter";
import {
  buildDirectionsQueryFromInputSignature,
  getDirectionsInputSignature,
  getDirectionsQueryKey,
  type DirectionsQueryBuildResult,
} from "@/features/map-sync/model/directions-query";

type RoutePreviewStatus = DirectionsQueryBuildResult["status"] | "error" | "loading" | "no-route";

type RoutePreview = {
  errorMessage?: string;
  route?: DirectionsRoute;
  status: RoutePreviewStatus;
};

type StoredRouteState = {
  key: string;
  route: DirectionsRoute | null;
};

type UseRoutePreviewOptions = {
  adapter?: DirectionsAdapter;
  travelMode?: DirectionsTravelMode;
};

const cacheLimit = 30;
const directionsCache = new Map<string, DirectionsRoute | null>();

function cacheRoute(key: string, route: DirectionsRoute | null) {
  directionsCache.delete(key);
  directionsCache.set(key, route);

  if (directionsCache.size > cacheLimit) {
    const oldestKey = directionsCache.keys().next().value;

    if (oldestKey) {
      directionsCache.delete(oldestKey);
    }
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useRoutePreview(
  items: readonly ItineraryItem[],
  { adapter = mockDirectionsAdapter, travelMode = "driving" }: UseRoutePreviewOptions = {},
) {
  const [storedRouteState, setStoredRouteState] = useState<StoredRouteState | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const inputSignature = getDirectionsInputSignature(items.map((item) => item.place));
  const queryResult = useMemo(
    () => buildDirectionsQueryFromInputSignature(inputSignature, travelMode),
    [inputSignature, travelMode],
  );
  const query = queryResult.status === "ready" ? queryResult.query : null;
  const queryKey = query ? getDirectionsQueryKey(query) : null;
  const cachedRoute =
    queryKey && directionsCache.has(queryKey) ? directionsCache.get(queryKey) ?? null : undefined;

  useEffect(() => {
    if (!query || !queryKey || directionsCache.has(queryKey)) {
      return;
    }

    const controller = new AbortController();

    void adapter
      .getRoute(query, { signal: controller.signal })
      .then((route) => {
        if (controller.signal.aborted) {
          return;
        }

        cacheRoute(queryKey, route);
        setStoredRouteState({ key: queryKey, route });
        setErrorState(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }

        setStoredRouteState(null);
        setErrorState({ key: queryKey, message: "경로를 불러오지 못했습니다." });
      });

    return () => controller.abort();
  }, [adapter, query, queryKey, retryVersion]);

  const preview: RoutePreview = getRoutePreview(
    queryResult,
    queryKey,
    cachedRoute,
    storedRouteState,
    errorState,
  );

  return {
    ...preview,
    retry: () => {
      if (!queryKey) {
        return;
      }

      directionsCache.delete(queryKey);
      setStoredRouteState(null);
      setErrorState(null);
      setRetryVersion((version) => version + 1);
    },
  };
}

function getRoutePreview(
  queryResult: DirectionsQueryBuildResult,
  queryKey: string | null,
  cachedRoute: DirectionsRoute | null | undefined,
  storedRouteState: StoredRouteState | null,
  errorState: { key: string; message: string } | null,
): RoutePreview {
  if (queryResult.status !== "ready" || !queryKey) {
    return queryResult;
  }

  if (errorState?.key === queryKey) {
    return { errorMessage: errorState.message, status: "error" };
  }

  if (cachedRoute !== undefined) {
    return cachedRoute === null
      ? { status: "no-route" }
      : { route: cachedRoute, status: "ready" };
  }

  if (storedRouteState?.key !== queryKey) {
    return { status: "loading" };
  }

  if (storedRouteState.route === null) {
    return { status: "no-route" };
  }

  return { route: storedRouteState.route, status: "ready" };
}

export function clearRoutePreviewCache() {
  directionsCache.clear();
}
