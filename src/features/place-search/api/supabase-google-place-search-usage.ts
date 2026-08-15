import { createSupabaseAdminClient } from "@/shared/api/supabase/admin";
import { z } from "@/shared/lib/zod";

import { getGooglePlaceSearchLimits } from "./google-place-search-limits";

const googleUsageReservationSchema = z.object({
  allowed: z.boolean(),
  daily_used: z.number().int().nonnegative(),
  monthly_used: z.number().int().nonnegative(),
});

const googleUsageReservationResponseSchema = z.array(googleUsageReservationSchema).length(1);

type GooglePlaceSearchUsageLimitErrorKind = "configuration" | "response" | "storage";

export class GooglePlaceSearchUsageLimitError extends Error {
  constructor(
    readonly kind: GooglePlaceSearchUsageLimitErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GooglePlaceSearchUsageLimitError";
  }
}

export type GooglePlaceSearchUsageReservation = z.infer<typeof googleUsageReservationSchema>;

export async function reserveGooglePlaceSearchUsage(): Promise<GooglePlaceSearchUsageReservation> {
  let limits: ReturnType<typeof getGooglePlaceSearchLimits>;

  try {
    limits = getGooglePlaceSearchLimits();
  } catch {
    throw new GooglePlaceSearchUsageLimitError(
      "configuration",
      "장소 검색 사용 한도 설정이 올바르지 않습니다.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("reserve_google_maps_usage", {
    p_daily_limit: limits.daily,
    p_monthly_limit: limits.monthly,
    p_operation: "places_text_search",
  });

  if (error) {
    throw new GooglePlaceSearchUsageLimitError(
      "storage",
      "장소 검색 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const parsedReservation = googleUsageReservationResponseSchema.safeParse(data);

  if (!parsedReservation.success) {
    throw new GooglePlaceSearchUsageLimitError(
      "response",
      "장소 검색 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  return parsedReservation.data[0];
}
