import { z } from "@/shared/lib/zod";

const defaultGoogleMapsJavascriptLimits = {
  daily: 20,
  monthly: 500,
} as const;

const googleMapsJavascriptLimitsSchema = z.object({
  GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT: z.coerce.number().int().min(1).max(100_000).default(
    defaultGoogleMapsJavascriptLimits.daily,
  ),
  GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT: z.coerce.number().int().min(1).max(1_000_000).default(
    defaultGoogleMapsJavascriptLimits.monthly,
  ),
});

export type GoogleMapsJavascriptLimits = {
  daily: number;
  monthly: number;
};

export function getGoogleMapsJavascriptLimits(): GoogleMapsJavascriptLimits {
  const parsedLimits = googleMapsJavascriptLimitsSchema.safeParse({
    GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT: process.env.GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT,
    GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT: process.env.GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT,
  });

  if (!parsedLimits.success) {
    throw new Error("지도 사용 한도 설정이 올바르지 않습니다.");
  }

  return {
    daily: parsedLimits.data.GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT,
    monthly: parsedLimits.data.GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT,
  };
}
