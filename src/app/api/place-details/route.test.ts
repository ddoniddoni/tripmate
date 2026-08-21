import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getGooglePlaceDetails: vi.fn(),
  reserveGooglePlaceDetailsUsage: vi.fn(),
}));

vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/features/place-search/api/google-place-details", () => ({
  getGooglePlaceDetails: mocks.getGooglePlaceDetails,
  GooglePlaceDetailsError: class GooglePlaceDetailsError extends Error {},
}));

vi.mock("@/features/place-search/api/supabase-google-place-details-usage", () => ({
  GooglePlaceDetailsUsageLimitError: class GooglePlaceDetailsUsageLimitError extends Error {},
  reserveGooglePlaceDetailsUsage: mocks.reserveGooglePlaceDetailsUsage,
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/place-details/route";

function createRequest(placeId?: string) {
  const searchParams = placeId ? `?placeId=${encodeURIComponent(placeId)}` : "";

  return new NextRequest(`http://localhost:3000/api/place-details${searchParams}`);
}

describe("GET /api/place-details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reserveGooglePlaceDetailsUsage.mockResolvedValue({
      allowed: true,
      daily_used: 1,
      monthly_used: 1,
    });
  });

  it("validates the place identifier before checking the session", async () => {
    const response = await GET(createRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "확인할 장소를 먼저 선택해 주세요." });
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(mocks.reserveGooglePlaceDetailsUsage).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(createRequest("ChIJ-test-place"));

    expect(response.status).toBe(401);
    expect(mocks.reserveGooglePlaceDetailsUsage).not.toHaveBeenCalled();
    expect(mocks.getGooglePlaceDetails).not.toHaveBeenCalled();
  });

  it("returns details only after reserving a separate usage slot", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.getGooglePlaceDetails.mockResolvedValue({
      rating: 4.6,
      regularOpeningHours: ["월요일: 오전 9:00 ~ 오후 6:00"],
      userRatingCount: 321,
    });

    const response = await GET(createRequest("ChIJ-test-place"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      details: {
        rating: 4.6,
        regularOpeningHours: ["월요일: 오전 9:00 ~ 오후 6:00"],
        userRatingCount: 321,
      },
    });
    expect(mocks.reserveGooglePlaceDetailsUsage).toHaveBeenCalledOnce();
    expect(mocks.getGooglePlaceDetails).toHaveBeenCalledWith("ChIJ-test-place");
  });

  it("does not call Google after the details limit is exhausted", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.reserveGooglePlaceDetailsUsage.mockResolvedValue({
      allowed: false,
      daily_used: 20,
      monthly_used: 62,
    });

    const response = await GET(createRequest("ChIJ-test-place"));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      message: "오늘 장소 상세 정보 조회 한도에 도달했어요. 내일 다시 시도해 주세요.",
    });
    expect(mocks.getGooglePlaceDetails).not.toHaveBeenCalled();
  });
});
