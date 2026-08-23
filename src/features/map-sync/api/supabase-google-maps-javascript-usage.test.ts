import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/shared/api/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  GoogleMapsJavascriptUsageLimitError,
  reserveGoogleMapsJavascriptUsage,
} from "@/features/map-sync/api/supabase-google-maps-javascript-usage";

const originalDailyLimit = process.env.GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT;
const originalMonthlyLimit = process.env.GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT;

describe("reserveGoogleMapsJavascriptUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT;
    delete process.env.GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT;
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({
      data: [{ allowed: true, daily_used: 1, monthly_used: 1 }],
      error: null,
    });
  });

  afterEach(() => {
    if (originalDailyLimit) {
      process.env.GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT = originalDailyLimit;
    } else {
      delete process.env.GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT;
    }

    if (originalMonthlyLimit) {
      process.env.GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT = originalMonthlyLimit;
    } else {
      delete process.env.GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT;
    }
  });

  it("uses safe default limits when no environment overrides are set", async () => {
    await expect(reserveGoogleMapsJavascriptUsage()).resolves.toEqual({
      allowed: true,
      daily_used: 1,
      monthly_used: 1,
    });

    expect(mocks.rpc).toHaveBeenCalledWith("reserve_google_maps_usage", {
      p_daily_limit: 250,
      p_monthly_limit: 8_000,
      p_operation: "maps_javascript_load",
    });
  });

  it("uses configured limits", async () => {
    process.env.GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT = "12";
    process.env.GOOGLE_MAPS_JAVASCRIPT_MONTHLY_LIMIT = "300";

    await reserveGoogleMapsJavascriptUsage();

    expect(mocks.rpc).toHaveBeenCalledWith("reserve_google_maps_usage", {
      p_daily_limit: 12,
      p_monthly_limit: 300,
      p_operation: "maps_javascript_load",
    });
  });

  it("refuses an invalid limit before contacting Supabase", async () => {
    process.env.GOOGLE_MAPS_JAVASCRIPT_DAILY_LIMIT = "0";

    await expect(reserveGoogleMapsJavascriptUsage()).rejects.toEqual(
      expect.objectContaining<Partial<GoogleMapsJavascriptUsageLimitError>>({
        kind: "configuration",
        message: "지도 사용 한도 설정이 올바르지 않습니다.",
      }),
    );

    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("fails closed when Supabase cannot reserve a usage slot", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });

    await expect(reserveGoogleMapsJavascriptUsage()).rejects.toEqual(
      expect.objectContaining<Partial<GoogleMapsJavascriptUsageLimitError>>({ kind: "storage" }),
    );
  });
});
