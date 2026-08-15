import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/shared/api/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  GooglePlaceSearchUsageLimitError,
  reserveGooglePlaceSearchUsage,
} from "@/features/place-search/api/supabase-google-place-search-usage";

const originalDailyLimit = process.env.GOOGLE_PLACES_SEARCH_DAILY_LIMIT;
const originalMonthlyLimit = process.env.GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT;

describe("reserveGooglePlaceSearchUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_PLACES_SEARCH_DAILY_LIMIT;
    delete process.env.GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT;
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({
      data: [{ allowed: true, daily_used: 1, monthly_used: 1 }],
      error: null,
    });
  });

  afterEach(() => {
    if (originalDailyLimit) {
      process.env.GOOGLE_PLACES_SEARCH_DAILY_LIMIT = originalDailyLimit;
    } else {
      delete process.env.GOOGLE_PLACES_SEARCH_DAILY_LIMIT;
    }

    if (originalMonthlyLimit) {
      process.env.GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT = originalMonthlyLimit;
    } else {
      delete process.env.GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT;
    }
  });

  it("uses safe default limits when no environment overrides are set", async () => {
    await expect(reserveGooglePlaceSearchUsage()).resolves.toEqual({
      allowed: true,
      daily_used: 1,
      monthly_used: 1,
    });

    expect(mocks.rpc).toHaveBeenCalledWith("reserve_google_maps_usage", {
      p_daily_limit: 100,
      p_monthly_limit: 1000,
      p_operation: "places_text_search",
    });
  });

  it("uses configured limits", async () => {
    process.env.GOOGLE_PLACES_SEARCH_DAILY_LIMIT = "24";
    process.env.GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT = "500";

    await reserveGooglePlaceSearchUsage();

    expect(mocks.rpc).toHaveBeenCalledWith("reserve_google_maps_usage", {
      p_daily_limit: 24,
      p_monthly_limit: 500,
      p_operation: "places_text_search",
    });
  });

  it("refuses an invalid limit before contacting Supabase", async () => {
    process.env.GOOGLE_PLACES_SEARCH_DAILY_LIMIT = "0";

    await expect(reserveGooglePlaceSearchUsage()).rejects.toEqual(
      expect.objectContaining<Partial<GooglePlaceSearchUsageLimitError>>({
        kind: "configuration",
        message: "장소 검색 사용 한도 설정이 올바르지 않습니다.",
      }),
    );

    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("fails closed when Supabase cannot reserve a usage slot", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });

    await expect(reserveGooglePlaceSearchUsage()).rejects.toEqual(
      expect.objectContaining<Partial<GooglePlaceSearchUsageLimitError>>({ kind: "storage" }),
    );
  });
});
