import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  reserveGoogleMapsJavascriptUsage: vi.fn(),
}));

vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/features/map-sync/api/supabase-google-maps-javascript-usage", () => ({
  GoogleMapsJavascriptUsageLimitError: class GoogleMapsJavascriptUsageLimitError extends Error {},
  reserveGoogleMapsJavascriptUsage: mocks.reserveGoogleMapsJavascriptUsage,
}));

import { POST } from "@/app/api/google-maps-access/route";

const originalMapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY;

describe("POST /api/google-maps-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY = "browser-map-key";
    mocks.reserveGoogleMapsJavascriptUsage.mockResolvedValue({
      allowed: true,
      daily_used: 1,
      monthly_used: 1,
    });
  });

  it("requires a logged-in user before reserving a map load", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.reserveGoogleMapsJavascriptUsage).not.toHaveBeenCalled();
  });

  it("does not reserve usage when the browser map key is missing", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY;

    const response = await POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "지도 키 설정을 확인해 주세요." });
    expect(mocks.reserveGoogleMapsJavascriptUsage).not.toHaveBeenCalled();
  });

  it("allows a signed-in user when a global slot is reserved", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ allowed: true });
    expect(mocks.reserveGoogleMapsJavascriptUsage).toHaveBeenCalledOnce();
  });

  it("stops before Google Maps when the global usage limit is exhausted", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.reserveGoogleMapsJavascriptUsage.mockResolvedValue({
      allowed: false,
      daily_used: 20,
      monthly_used: 124,
    });

    const response = await POST();

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      message: "오늘 지도 표시 한도에 도달했어요. 내일 다시 시도해 주세요.",
    });
  });
});

afterAll(() => {
  if (originalMapKey) {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY = originalMapKey;
  } else {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY;
  }
});
