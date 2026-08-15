import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getGoogleRoute: vi.fn(),
  reserveGoogleRoutesUsage: vi.fn(),
  GoogleRoutesError: class GoogleRoutesError extends Error {
    constructor(
      readonly kind: "configuration" | "provider" | "response",
      message: string,
    ) {
      super(message);
    }
  },
  GoogleRoutesUsageLimitError: class GoogleRoutesUsageLimitError extends Error {},
}));

vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/features/map-sync/api/google-routes", () => ({
  GoogleRoutesError: mocks.GoogleRoutesError,
  getGoogleRoute: mocks.getGoogleRoute,
}));

vi.mock("@/features/map-sync/api/supabase-google-routes-usage", () => ({
  GoogleRoutesUsageLimitError: mocks.GoogleRoutesUsageLimitError,
  reserveGoogleRoutesUsage: mocks.reserveGoogleRoutesUsage,
}));

import { NextRequest } from "next/server";

import { POST } from "@/app/api/directions/route";

const query = {
  coordinates: [
    { latitude: 33.5115, longitude: 126.5201 },
    { latitude: 33.5431, longitude: 126.6692 },
  ],
  travelMode: "driving",
};

const route = {
  coordinates: query.coordinates,
  distanceMeters: 16_000,
  durationSeconds: 1_900,
  legs: [{ distanceMeters: 16_000, durationSeconds: 1_900 }],
};

function createRequest(payload: unknown) {
  return new NextRequest("http://localhost:3000/api/directions", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/directions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reserveGoogleRoutesUsage.mockResolvedValue({
      allowed: true,
      daily_used: 1,
      monthly_used: 1,
    });
  });

  it("rejects invalid coordinates before checking the user session", async () => {
    const response = await POST(createRequest({ coordinates: [], travelMode: "driving" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "이동 경로는 장소 2곳에서 12곳까지 계산할 수 있어요.",
    });
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(createRequest(query));

    expect(response.status).toBe(401);
    expect(mocks.reserveGoogleRoutesUsage).not.toHaveBeenCalled();
    expect(mocks.getGoogleRoute).not.toHaveBeenCalled();
  });

  it("reserves a hard-limit slot before calculating the actual route", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.getGoogleRoute.mockResolvedValue(route);

    const response = await POST(createRequest(query));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ route });
    expect(mocks.reserveGoogleRoutesUsage).toHaveBeenCalledOnce();
    expect(mocks.getGoogleRoute).toHaveBeenCalledWith(query);
  });

  it("stops before Google when the hard limit is exhausted", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.reserveGoogleRoutesUsage.mockResolvedValue({
      allowed: false,
      daily_used: 100,
      monthly_used: 100,
    });

    const response = await POST(createRequest(query));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      message: "오늘 실제 이동 경로 계산 한도에 도달했어요. 내일 다시 시도해 주세요.",
    });
    expect(mocks.getGoogleRoute).not.toHaveBeenCalled();
  });

  it("returns a clear activation message when Routes API is disabled", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.getGoogleRoute.mockRejectedValue(
      new mocks.GoogleRoutesError(
        "configuration",
        "실제 이동 시간 설정이 필요합니다. Routes API를 활성화하고 서버 키 제한에 추가해 주세요.",
      ),
    );

    const response = await POST(createRequest(query));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      message:
        "실제 이동 시간 설정이 필요합니다. Routes API를 활성화하고 서버 키 제한에 추가해 주세요.",
    });
  });
});
