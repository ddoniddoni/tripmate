import { z } from "@/shared/lib/zod";

const defaultGooglePlaceSearchLimits = {
  daily: 100,
  monthly: 1000,
} as const;

const googlePlaceSearchLimitsSchema = z.object({
  GOOGLE_PLACES_SEARCH_DAILY_LIMIT: z.coerce.number().int().min(1).max(100_000).default(
    defaultGooglePlaceSearchLimits.daily,
  ),
  GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT: z.coerce.number().int().min(1).max(1_000_000).default(
    defaultGooglePlaceSearchLimits.monthly,
  ),
});

export type GooglePlaceSearchLimits = {
  daily: number;
  monthly: number;
};

export function getGooglePlaceSearchLimits(): GooglePlaceSearchLimits {
  const parsedLimits = googlePlaceSearchLimitsSchema.safeParse({
    GOOGLE_PLACES_SEARCH_DAILY_LIMIT: process.env.GOOGLE_PLACES_SEARCH_DAILY_LIMIT,
    GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT: process.env.GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT,
  });

  if (!parsedLimits.success) {
    throw new Error("장소 검색 사용 한도 설정이 올바르지 않습니다.");
  }

  return {
    daily: parsedLimits.data.GOOGLE_PLACES_SEARCH_DAILY_LIMIT,
    monthly: parsedLimits.data.GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT,
  };
}
