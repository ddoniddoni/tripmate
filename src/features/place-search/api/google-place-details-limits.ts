import { z } from "@/shared/lib/zod";

const defaultGooglePlaceDetailsLimits = {
  daily: 20,
  monthly: 100,
} as const;

const googlePlaceDetailsLimitsSchema = z.object({
  GOOGLE_PLACES_DETAILS_DAILY_LIMIT: z.coerce.number().int().min(1).max(100_000).default(
    defaultGooglePlaceDetailsLimits.daily,
  ),
  GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT: z.coerce.number().int().min(1).max(1_000_000).default(
    defaultGooglePlaceDetailsLimits.monthly,
  ),
});

export type GooglePlaceDetailsLimits = {
  daily: number;
  monthly: number;
};

export function getGooglePlaceDetailsLimits(): GooglePlaceDetailsLimits {
  const parsedLimits = googlePlaceDetailsLimitsSchema.safeParse({
    GOOGLE_PLACES_DETAILS_DAILY_LIMIT: process.env.GOOGLE_PLACES_DETAILS_DAILY_LIMIT,
    GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT: process.env.GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT,
  });

  if (!parsedLimits.success) {
    throw new Error("장소 상세 정보 사용 한도 설정이 올바르지 않습니다.");
  }

  return {
    daily: parsedLimits.data.GOOGLE_PLACES_DETAILS_DAILY_LIMIT,
    monthly: parsedLimits.data.GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT,
  };
}
