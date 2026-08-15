import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/shared/api/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  GoogleRoutesUsageLimitError,
  reserveGoogleRoutesUsage,
} from "@/features/map-sync/api/supabase-google-routes-usage";

const originalDailyLimit = process.env.GOOGLE_ROUTES_DAILY_LIMIT;
const originalMonthlyLimit = process.env.GOOGLE_ROUTES_MONTHLY_LIMIT;

describe("reserveGoogleRoutesUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_ROUTES_DAILY_LIMIT;
    delete process.env.GOOGLE_ROUTES_MONTHLY_LIMIT;
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({
      data: [{ allowed: true, daily_used: 1, monthly_used: 1 }],
      error: null,
    });
  });

  afterEach(() => {
    if (originalDailyLimit) {
      process.env.GOOGLE_ROUTES_DAILY_LIMIT = originalDailyLimit;
    } else {
      delete process.env.GOOGLE_ROUTES_DAILY_LIMIT;
    }

    if (originalMonthlyLimit) {
      process.env.GOOGLE_ROUTES_MONTHLY_LIMIT = originalMonthlyLimit;
    } else {
      delete process.env.GOOGLE_ROUTES_MONTHLY_LIMIT;
    }
  });

  it("uses the safe route defaults", async () => {
    await reserveGoogleRoutesUsage();

    expect(mocks.rpc).toHaveBeenCalledWith("reserve_google_maps_usage", {
      p_daily_limit: 100,
      p_monthly_limit: 1000,
      p_operation: "routes_compute",
    });
  });

  it("fails closed before contacting Google when usage reservation fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });

    await expect(reserveGoogleRoutesUsage()).rejects.toEqual(
      expect.objectContaining<Partial<GoogleRoutesUsageLimitError>>({ kind: "storage" }),
    );
  });
});
