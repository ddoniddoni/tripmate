import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import {
  placeSearchResponseSchema,
  type PlaceSearchAdapter,
} from "@/features/place-search/model/place-search-adapter";

const placeSearchPath = "/api/place-search";

async function getErrorMessage(response: Response) {
  const payload: unknown = await response.json().catch(() => null);

  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string" &&
    payload.message.trim()
  ) {
    return payload.message;
  }

  return "장소 검색을 완료하지 못했습니다. 다시 시도해 주세요.";
}

function createPlaceSearchUrl(query: string) {
  const searchParams = new URLSearchParams({ query });

  return `${placeSearchPath}?${searchParams.toString()}`;
}

export const placeSearchApiAdapter: PlaceSearchAdapter = {
  async search(query, options) {
    const response = await fetch(createPlaceSearchUrl(query), {
      headers: { Accept: "application/json" },
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const payload: unknown = await response.json().catch(() => null);
    const parsed = placeSearchResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new Error("장소 검색 결과를 처리하지 못했습니다. 다시 시도해 주세요.");
    }

    return parsed.data.places satisfies PlaceSnapshot[];
  },
};
