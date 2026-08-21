import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/shared/api/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  GooglePlaceDetailsUsageLimitError,
  reserveGooglePlaceDetailsUsage,
} from "@/features/place-search/api/supabase-google-place-details-usage";

const originalDailyLimit = process.env.GOOGLE_PLACES_DETAILS_DAILY_LIMIT;
const originalMonthlyLimit = process.env.GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT;

describe("reserveGooglePlaceDetailsUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_PLACES_DETAILS_DAILY_LIMIT;
    delete process.env.GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT;
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({
      data: [{ allowed: true, daily_used: 1, monthly_used: 1 }],
      error: null,
    });
  });

  afterEach(() => {
    if (originalDailyLimit) {
      process.env.GOOGLE_PLACES_DETAILS_DAILY_LIMIT = originalDailyLimit;
    } else {
      delete process.env.GOOGLE_PLACES_DETAILS_DAILY_LIMIT;
    }

    if (originalMonthlyLimit) {
      process.env.GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT = originalMonthlyLimit;
    } else {
      delete process.env.GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT;
    }
  });

  it("uses the smaller default caps for explicit detail requests", async () => {
    await reserveGooglePlaceDetailsUsage();

    expect(mocks.rpc).toHaveBeenCalledWith("reserve_google_maps_usage", {
      p_daily_limit: 20,
      p_monthly_limit: 100,
      p_operation: "places_details",
    });
  });

  it("refuses invalid configuration before contacting Supabase", async () => {
    process.env.GOOGLE_PLACES_DETAILS_DAILY_LIMIT = "0";

    await expect(reserveGooglePlaceDetailsUsage()).rejects.toEqual(
      expect.objectContaining<Partial<GooglePlaceDetailsUsageLimitError>>({
        kind: "configuration",
        message: "장소 상세 정보 사용 한도 설정이 올바르지 않습니다.",
      }),
    );

    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});
