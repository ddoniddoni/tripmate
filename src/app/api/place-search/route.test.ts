import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  reserveGooglePlaceSearchUsage: vi.fn(),
  searchGooglePlaces: vi.fn(),
}));

vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/features/place-search/api/google-place-search", () => ({
  GooglePlaceSearchError: class GooglePlaceSearchError extends Error {},
  searchGooglePlaces: mocks.searchGooglePlaces,
}));

vi.mock("@/features/place-search/api/supabase-google-place-search-usage", () => ({
  GooglePlaceSearchUsageLimitError: class GooglePlaceSearchUsageLimitError extends Error {},
  reserveGooglePlaceSearchUsage: mocks.reserveGooglePlaceSearchUsage,
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/place-search/route";

const place = {
  address: "서울특별시 성동구 성수이로 7길 1",
  latitude: 37.5445,
  longitude: 127.0557,
  name: "테스트 카페",
  provider: "google",
  providerPlaceId: "google.test-cafe",
};

function createRequest(query?: string) {
  const searchParams = query ? `?query=${encodeURIComponent(query)}` : "";

  return new NextRequest(`http://localhost:3000/api/place-search${searchParams}`);
}

describe("GET /api/place-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reserveGooglePlaceSearchUsage.mockResolvedValue({
      allowed: true,
      daily_used: 1,
      monthly_used: 1,
    });
  });

  it("rejects short queries before checking the user session", async () => {
    const response = await GET(createRequest("성"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "두 글자 이상의 장소명이나 주소를 입력해 주세요." });
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(mocks.reserveGooglePlaceSearchUsage).not.toHaveBeenCalled();
  });

  it("requires a logged-in user", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(createRequest("성수 카페"));

    expect(response.status).toBe(401);
    expect(mocks.reserveGooglePlaceSearchUsage).not.toHaveBeenCalled();
    expect(mocks.searchGooglePlaces).not.toHaveBeenCalled();
  });

  it("returns normalized provider results for signed-in users", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.searchGooglePlaces.mockResolvedValue([place]);

    const response = await GET(createRequest("성수 카페"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ places: [place] });
    expect(mocks.reserveGooglePlaceSearchUsage).toHaveBeenCalledOnce();
    expect(mocks.searchGooglePlaces).toHaveBeenCalledWith("성수 카페");
  });

  it("stops before Google when the global usage limit is exhausted", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.reserveGooglePlaceSearchUsage.mockResolvedValue({
      allowed: false,
      daily_used: 100,
      monthly_used: 124,
    });

    const response = await GET(createRequest("성수 카페"));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      message: "오늘 장소 검색 한도에 도달했어요. 내일 다시 시도해 주세요.",
    });
    expect(mocks.searchGooglePlaces).not.toHaveBeenCalled();
  });

  it("returns a recoverable provider error", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.searchGooglePlaces.mockRejectedValue(new Error("provider unavailable"));

    const response = await GET(createRequest("성수 카페"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: "장소 검색을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });
});
