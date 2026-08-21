import { placeDetailsSchema, type PlaceDetails } from "@/entities/place/model/place-details";
import { z } from "@/shared/lib/zod";

const googlePlaceDetailsUrl = "https://places.googleapis.com/v1/places";
const googlePlaceDetailsFieldMask = "rating,userRatingCount,regularOpeningHours";

const googlePlaceDetailsResponseSchema = z.object({
  rating: z.number().finite().min(0).max(5).optional(),
  regularOpeningHours: z
    .object({
      weekdayDescriptions: z.array(z.string().trim().min(1).max(200)).max(7).optional(),
    })
    .optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
});

type GooglePlaceDetailsErrorKind = "configuration" | "provider" | "response";

export class GooglePlaceDetailsError extends Error {
  constructor(
    readonly kind: GooglePlaceDetailsErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GooglePlaceDetailsError";
  }
}

function getGoogleMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    throw new GooglePlaceDetailsError(
      "configuration",
      "장소 상세 정보 설정이 아직 완료되지 않았습니다.",
    );
  }

  return apiKey;
}

export async function getGooglePlaceDetails(
  providerPlaceId: string,
  options?: { signal?: AbortSignal },
): Promise<PlaceDetails> {
  const normalizedPlaceId = providerPlaceId.trim();

  if (!normalizedPlaceId) {
    throw new GooglePlaceDetailsError("response", "장소 정보를 확인하지 못했습니다.");
  }

  let response: Response;

  try {
    response = await fetch(`${googlePlaceDetailsUrl}/${encodeURIComponent(normalizedPlaceId)}`, {
      cache: "no-store",
      headers: {
        "X-Goog-Api-Key": getGoogleMapsApiKey(),
        "X-Goog-FieldMask": googlePlaceDetailsFieldMask,
      },
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof GooglePlaceDetailsError || isAbortError(error)) {
      throw error;
    }

    throw new GooglePlaceDetailsError(
      "provider",
      "장소 상세 정보 서비스에 연결하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  if (!response.ok) {
    throw new GooglePlaceDetailsError(
      "provider",
      "장소 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  const parsedResponse = googlePlaceDetailsResponseSchema.safeParse(payload);

  if (!parsedResponse.success) {
    throw new GooglePlaceDetailsError(
      "response",
      "장소 상세 정보를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  const details = placeDetailsSchema.safeParse({
    rating: parsedResponse.data.rating,
    regularOpeningHours: parsedResponse.data.regularOpeningHours?.weekdayDescriptions,
    userRatingCount: parsedResponse.data.userRatingCount,
  });

  if (!details.success) {
    throw new GooglePlaceDetailsError(
      "response",
      "장소 상세 정보를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  return details.data;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
