"use client";

import { useCallback, useRef, useState } from "react";

import type { PlaceDetails } from "@/entities/place/model/place-details";
import { placeDetailsApiAdapter } from "@/features/place-search/api/place-details-api-adapter";
import type { PlaceDetailsAdapter } from "@/features/place-search/model/place-details-adapter";

export type PlaceDetailsStatus = "error" | "idle" | "loading" | "success";

export type PlaceDetailsState = {
  details: PlaceDetails | null;
  errorMessage: string | null;
  placeId: string | null;
  status: PlaceDetailsStatus;
};

const initialState: PlaceDetailsState = {
  details: null,
  errorMessage: null,
  placeId: null,
  status: "idle",
};

export function usePlaceDetails(adapter: PlaceDetailsAdapter = placeDetailsApiAdapter) {
  const cachedDetails = useRef(new Map<string, PlaceDetails>());
  const requestId = useRef(0);
  const [state, setState] = useState<PlaceDetailsState>(initialState);

  const load = useCallback(
    async (providerPlaceId: string) => {
      const normalizedPlaceId = providerPlaceId.trim();
      const cached = cachedDetails.current.get(normalizedPlaceId);

      if (cached) {
        setState({
          details: cached,
          errorMessage: null,
          placeId: normalizedPlaceId,
          status: "success",
        });
        return;
      }

      const currentRequestId = requestId.current + 1;
      requestId.current = currentRequestId;
      setState({
        details: null,
        errorMessage: null,
        placeId: normalizedPlaceId,
        status: "loading",
      });

      try {
        const details = await adapter.getDetails(normalizedPlaceId);

        cachedDetails.current.set(normalizedPlaceId, details);

        if (requestId.current !== currentRequestId) {
          return;
        }

        setState({
          details,
          errorMessage: null,
          placeId: normalizedPlaceId,
          status: "success",
        });
      } catch (error) {
        if (requestId.current !== currentRequestId) {
          return;
        }

        setState({
          details: null,
          errorMessage:
            error instanceof Error
              ? error.message
              : "장소 상세 정보를 불러오지 못했습니다. 다시 시도해 주세요.",
          placeId: normalizedPlaceId,
          status: "error",
        });
      }
    },
    [adapter],
  );

  const reset = useCallback(() => {
    requestId.current += 1;
    setState(initialState);
  }, []);

  return { ...state, load, reset };
}
