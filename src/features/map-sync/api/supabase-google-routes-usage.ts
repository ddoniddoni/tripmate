import { createSupabaseAdminClient } from "@/shared/api/supabase/admin";
import { z } from "@/shared/lib/zod";

import { getGoogleRoutesLimits } from "./google-routes-limits";

const googleUsageReservationSchema = z.object({
  allowed: z.boolean(),
  daily_used: z.number().int().nonnegative(),
  monthly_used: z.number().int().nonnegative(),
});

const googleUsageReservationResponseSchema = z.array(googleUsageReservationSchema).length(1);

type GoogleRoutesUsageLimitErrorKind = "configuration" | "response" | "storage";

export class GoogleRoutesUsageLimitError extends Error {
  constructor(
    readonly kind: GoogleRoutesUsageLimitErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GoogleRoutesUsageLimitError";
  }
}

export type GoogleRoutesUsageReservation = z.infer<typeof googleUsageReservationSchema>;

export async function reserveGoogleRoutesUsage(): Promise<GoogleRoutesUsageReservation> {
  let limits: ReturnType<typeof getGoogleRoutesLimits>;

  try {
    limits = getGoogleRoutesLimits();
  } catch {
    throw new GoogleRoutesUsageLimitError(
      "configuration",
      "실제 이동 경로 사용 한도 설정이 올바르지 않습니다.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("reserve_google_maps_usage", {
    p_daily_limit: limits.daily,
    p_monthly_limit: limits.monthly,
    p_operation: "routes_compute",
  });

  if (error) {
    throw new GoogleRoutesUsageLimitError(
      "storage",
      "실제 이동 경로 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const parsedReservation = googleUsageReservationResponseSchema.safeParse(data);

  if (!parsedReservation.success) {
    throw new GoogleRoutesUsageLimitError(
      "response",
      "실제 이동 경로 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  return parsedReservation.data[0];
}
