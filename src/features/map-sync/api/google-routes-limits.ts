import { z } from "@/shared/lib/zod";

const defaultGoogleRoutesLimits = {
  daily: 100,
  monthly: 1000,
} as const;

const googleRoutesLimitsSchema = z.object({
  GOOGLE_ROUTES_DAILY_LIMIT: z.coerce.number().int().min(1).max(100_000).default(
    defaultGoogleRoutesLimits.daily,
  ),
  GOOGLE_ROUTES_MONTHLY_LIMIT: z.coerce.number().int().min(1).max(1_000_000).default(
    defaultGoogleRoutesLimits.monthly,
  ),
});

export type GoogleRoutesLimits = {
  daily: number;
  monthly: number;
};

export function getGoogleRoutesLimits(): GoogleRoutesLimits {
  const parsedLimits = googleRoutesLimitsSchema.safeParse({
    GOOGLE_ROUTES_DAILY_LIMIT: process.env.GOOGLE_ROUTES_DAILY_LIMIT,
    GOOGLE_ROUTES_MONTHLY_LIMIT: process.env.GOOGLE_ROUTES_MONTHLY_LIMIT,
  });

  if (!parsedLimits.success) {
    throw new Error("실제 이동 경로 사용 한도 설정이 올바르지 않습니다.");
  }

  return {
    daily: parsedLimits.data.GOOGLE_ROUTES_DAILY_LIMIT,
    monthly: parsedLimits.data.GOOGLE_ROUTES_MONTHLY_LIMIT,
  };
}
