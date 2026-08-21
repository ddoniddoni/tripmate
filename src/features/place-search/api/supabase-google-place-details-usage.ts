import { createSupabaseAdminClient } from "@/shared/api/supabase/admin";
import { z } from "@/shared/lib/zod";

import { getGooglePlaceDetailsLimits } from "./google-place-details-limits";

const googleUsageReservationSchema = z.object({
  allowed: z.boolean(),
  daily_used: z.number().int().nonnegative(),
  monthly_used: z.number().int().nonnegative(),
});

const googleUsageReservationResponseSchema = z.array(googleUsageReservationSchema).length(1);

type GooglePlaceDetailsUsageLimitErrorKind = "configuration" | "response" | "storage";

export class GooglePlaceDetailsUsageLimitError extends Error {
  constructor(
    readonly kind: GooglePlaceDetailsUsageLimitErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GooglePlaceDetailsUsageLimitError";
  }
}

export type GooglePlaceDetailsUsageReservation = z.infer<typeof googleUsageReservationSchema>;

export async function reserveGooglePlaceDetailsUsage(): Promise<GooglePlaceDetailsUsageReservation> {
  let limits: ReturnType<typeof getGooglePlaceDetailsLimits>;

  try {
    limits = getGooglePlaceDetailsLimits();
  } catch {
    throw new GooglePlaceDetailsUsageLimitError(
      "configuration",
      "장소 상세 정보 사용 한도 설정이 올바르지 않습니다.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("reserve_google_maps_usage", {
    p_daily_limit: limits.daily,
    p_monthly_limit: limits.monthly,
    p_operation: "places_details",
  });

  if (error) {
    throw new GooglePlaceDetailsUsageLimitError(
      "storage",
      "장소 상세 정보 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const parsedReservation = googleUsageReservationResponseSchema.safeParse(data);

  if (!parsedReservation.success) {
    throw new GooglePlaceDetailsUsageLimitError(
      "response",
      "장소 상세 정보 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  return parsedReservation.data[0];
}
