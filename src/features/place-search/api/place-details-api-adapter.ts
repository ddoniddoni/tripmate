import type { PlaceDetails } from "@/entities/place/model/place-details";
import {
  placeDetailsResponseSchema,
  type PlaceDetailsAdapter,
} from "@/features/place-search/model/place-details-adapter";

const placeDetailsPath = "/api/place-details";

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

  return "장소 상세 정보를 불러오지 못했습니다. 다시 시도해 주세요.";
}

function createPlaceDetailsUrl(providerPlaceId: string) {
  const searchParams = new URLSearchParams({ placeId: providerPlaceId });

  return `${placeDetailsPath}?${searchParams.toString()}`;
}

export const placeDetailsApiAdapter: PlaceDetailsAdapter = {
  async getDetails(providerPlaceId, options) {
    const response = await fetch(createPlaceDetailsUrl(providerPlaceId), {
      headers: { Accept: "application/json" },
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const payload: unknown = await response.json().catch(() => null);
    const parsed = placeDetailsResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new Error("장소 상세 정보를 처리하지 못했습니다. 다시 시도해 주세요.");
    }

    return parsed.data.details satisfies PlaceDetails;
  },
};
