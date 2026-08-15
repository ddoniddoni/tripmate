import { createSupabaseAdminClient } from "@/shared/api/supabase/admin";
import { z } from "@/shared/lib/zod";

import { getGoogleMapsJavascriptLimits } from "./google-maps-javascript-limits";

const googleUsageReservationSchema = z.object({
  allowed: z.boolean(),
  daily_used: z.number().int().nonnegative(),
  monthly_used: z.number().int().nonnegative(),
});

const googleUsageReservationResponseSchema = z.array(googleUsageReservationSchema).length(1);

type GoogleMapsJavascriptUsageLimitErrorKind = "configuration" | "response" | "storage";

export class GoogleMapsJavascriptUsageLimitError extends Error {
  constructor(
    readonly kind: GoogleMapsJavascriptUsageLimitErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GoogleMapsJavascriptUsageLimitError";
  }
}

export type GoogleMapsJavascriptUsageReservation = z.infer<typeof googleUsageReservationSchema>;

export async function reserveGoogleMapsJavascriptUsage(): Promise<GoogleMapsJavascriptUsageReservation> {
  let limits: ReturnType<typeof getGoogleMapsJavascriptLimits>;

  try {
    limits = getGoogleMapsJavascriptLimits();
  } catch {
    throw new GoogleMapsJavascriptUsageLimitError(
      "configuration",
      "지도 사용 한도 설정이 올바르지 않습니다.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("reserve_google_maps_usage", {
    p_daily_limit: limits.daily,
    p_monthly_limit: limits.monthly,
    p_operation: "maps_javascript_load",
  });

  if (error) {
    throw new GoogleMapsJavascriptUsageLimitError(
      "storage",
      "지도 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const parsedReservation = googleUsageReservationResponseSchema.safeParse(data);

  if (!parsedReservation.success) {
    throw new GoogleMapsJavascriptUsageLimitError(
      "response",
      "지도 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  return parsedReservation.data[0];
}
