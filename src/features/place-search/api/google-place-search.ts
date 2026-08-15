import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import { placeSnapshotSchema } from "@/entities/place/model/place-snapshot";
import { z } from "@/shared/lib/zod";

const googleTextSearchUrl = "https://places.googleapis.com/v1/places:searchText";
const googleTextSearchFieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryTypeDisplayName",
].join(",");

const googlePlaceSchema = z.object({
  displayName: z.object({ text: z.string().trim().min(1) }),
  formattedAddress: z.string().trim().min(1),
  id: z.string().trim().min(1),
  location: z.object({
    latitude: z.number().finite(),
    longitude: z.number().finite(),
  }),
  primaryTypeDisplayName: z.object({ text: z.string().trim().min(1) }).optional(),
});

const googleTextSearchResponseSchema = z.object({
  places: z.array(z.unknown()).optional(),
});

type GooglePlaceSearchErrorKind = "configuration" | "provider" | "response";

export class GooglePlaceSearchError extends Error {
  constructor(
    readonly kind: GooglePlaceSearchErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GooglePlaceSearchError";
  }
}

function getGoogleMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    throw new GooglePlaceSearchError(
      "configuration",
      "장소 검색 설정이 아직 완료되지 않았습니다.",
    );
  }

  return apiKey;
}

function normalizeGooglePlace(place: unknown): PlaceSnapshot | null {
  const parsedPlace = googlePlaceSchema.safeParse(place);

  if (!parsedPlace.success) {
    return null;
  }

  const { displayName, formattedAddress, id, location, primaryTypeDisplayName } = parsedPlace.data;
  const snapshot = placeSnapshotSchema.safeParse({
    address: formattedAddress,
    category: primaryTypeDisplayName?.text,
    latitude: location.latitude,
    longitude: location.longitude,
    name: displayName.text,
    provider: "google",
    providerPlaceId: id,
  });

  return snapshot.success ? snapshot.data : null;
}

export async function searchGooglePlaces(
  query: string,
  options?: { signal?: AbortSignal },
): Promise<PlaceSnapshot[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  let response: Response;

  try {
    response = await fetch(googleTextSearchUrl, {
      body: JSON.stringify({
        languageCode: "ko",
        pageSize: 5,
        textQuery: normalizedQuery,
      }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": getGoogleMapsApiKey(),
        "X-Goog-FieldMask": googleTextSearchFieldMask,
      },
      method: "POST",
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof GooglePlaceSearchError || isAbortError(error)) {
      throw error;
    }

    throw new GooglePlaceSearchError(
      "provider",
      "장소 검색 서비스에 연결하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  if (!response.ok) {
    throw new GooglePlaceSearchError(
      "provider",
      "장소 검색 서비스가 현재 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  const parsedResponse = googleTextSearchResponseSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new GooglePlaceSearchError(
      "response",
      "장소 검색 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  return (parsedResponse.data.places ?? []).flatMap((place) => {
    const normalizedPlace = normalizeGooglePlace(place);

    return normalizedPlace ? [normalizedPlace] : [];
  });
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
