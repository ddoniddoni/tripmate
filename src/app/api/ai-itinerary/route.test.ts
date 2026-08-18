import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMockAiItineraryPlan: vi.fn(),
  generateOpenAiItineraryPlan: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getSupabaseTrip: vi.fn(),
  isOpenAiItineraryPlanConfigured: vi.fn(),
  listSupabaseTripMembers: vi.fn(),
}));

vi.mock("@/features/auth/model/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/entities/trip/api/supabase-trip-repository", () => ({
  getSupabaseTrip: mocks.getSupabaseTrip,
  listSupabaseTripMembers: mocks.listSupabaseTripMembers,
}));

vi.mock("@/features/ai-itinerary/api/mock-itinerary-plan", () => ({
  createMockAiItineraryPlan: mocks.createMockAiItineraryPlan,
}));

vi.mock("@/features/ai-itinerary/api/openai-itinerary-plan", () => ({
  OpenAiItineraryPlanError: class OpenAiItineraryPlanError extends Error {
    constructor(kind: string) {
      super(
        kind === "trip-too-long"
          ? "AI 동선 추천은 최대 14일 여행까지 만들 수 있어요."
          : "AI 동선 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  },
  generateOpenAiItineraryPlan: mocks.generateOpenAiItineraryPlan,
  isOpenAiItineraryPlanConfigured: mocks.isOpenAiItineraryPlanConfigured,
}));

import { NextRequest } from "next/server";

import { POST } from "@/app/api/ai-itinerary/route";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const trip = {
  destination: "대한민국 · 부산",
  endDate: "2026-10-11",
  id: tripId,
  startDate: "2026-10-10",
  timeZone: "Asia/Seoul",
  title: "가을의 부산",
};
const plan = {
  days: [
    {
      date: "2026-10-10",
      routeTip: "해운대와 광안리를 같은 날에 이어 보세요.",
      stops: [
        { area: "해운대", description: "바다를 따라 천천히 시작해 보세요.", period: "morning" },
        { area: "광안리", description: "해 질 무렵 풍경을 즐겨 보세요.", period: "evening" },
      ],
      theme: "바다와 야경을 잇는 첫날",
    },
    {
      date: "2026-10-11",
      routeTip: "원도심 권역을 한 번에 둘러보세요.",
      stops: [
        { area: "감천문화마을", description: "골목을 여유 있게 둘러보세요.", period: "morning" },
        { area: "남포동", description: "시장과 항구 산책을 이어 보세요.", period: "afternoon" },
      ],
      theme: "골목과 항구를 걷는 둘째 날",
    },
  ],
  overview: "바다와 원도심을 나눠 둘러보는 1박 2일 부산 초안이에요.",
  routeRationale: "가까운 권역을 하루에 묶어 되돌아가는 이동을 줄였어요.",
};

function createRequest(payload: unknown) {
  return new NextRequest("http://localhost:3000/api/ai-itinerary", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/ai-itinerary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isOpenAiItineraryPlanConfigured.mockReturnValue(true);
    mocks.getAuthenticatedUser.mockResolvedValue({ email: "traveler@example.com", id: "user-1" });
    mocks.getSupabaseTrip.mockResolvedValue(trip);
    mocks.listSupabaseTripMembers.mockResolvedValue([
      { displayName: "여행자", role: "owner", userId: "user-1" },
    ]);
    mocks.generateOpenAiItineraryPlan.mockResolvedValue(plan);
  });

  it("rejects malformed requests before reading the user session", async () => {
    const response = await POST(createRequest({ tripId: "not-a-uuid" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "여행 정보를 다시 확인해 주세요." });
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("requires a signed-in trip member", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(createRequest({ tripId }));

    expect(response.status).toBe(401);
    expect(mocks.getSupabaseTrip).not.toHaveBeenCalled();
  });

  it("rejects viewers before calling the AI provider", async () => {
    mocks.listSupabaseTripMembers.mockResolvedValue([
      { displayName: "여행자", role: "viewer", userId: "user-1" },
    ]);

    const response = await POST(createRequest({ tripId }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: "보기 전용 권한에서는 AI 동선 초안을 만들 수 없습니다.",
    });
    expect(mocks.generateOpenAiItineraryPlan).not.toHaveBeenCalled();
  });

  it("creates a route draft from the authoritative trip data for an editor", async () => {
    const response = await POST(createRequest({ tripId }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ plan, source: "ai" });
    expect(mocks.getSupabaseTrip).toHaveBeenCalledWith(tripId);
    expect(mocks.listSupabaseTripMembers).toHaveBeenCalledWith(tripId);
    expect(mocks.generateOpenAiItineraryPlan).toHaveBeenCalledWith(trip);
  });

  it("returns a clearly marked mock plan in development without calling OpenAI", async () => {
    const mockPlan = { ...plan, overview: "개발용 미리보기 동선이에요." };
    mocks.isOpenAiItineraryPlanConfigured.mockReturnValue(false);
    mocks.createMockAiItineraryPlan.mockReturnValue(mockPlan);
    vi.stubEnv("NODE_ENV", "development");

    const response = await POST(createRequest({ tripId }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ plan: mockPlan, source: "mock" });
    expect(mocks.createMockAiItineraryPlan).toHaveBeenCalledWith(trip);
    expect(mocks.generateOpenAiItineraryPlan).not.toHaveBeenCalled();
  });

  it("keeps the OpenAI path outside development when a key is missing", async () => {
    mocks.isOpenAiItineraryPlanConfigured.mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(createRequest({ tripId }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ plan, source: "ai" });
    expect(mocks.createMockAiItineraryPlan).not.toHaveBeenCalled();
    expect(mocks.generateOpenAiItineraryPlan).toHaveBeenCalledWith(trip);
  });

  it("keeps the 14-day limit before generating a mock or calling OpenAI", async () => {
    mocks.getSupabaseTrip.mockResolvedValue({
      ...trip,
      endDate: "2026-10-15",
      startDate: "2026-10-01",
    });
    mocks.isOpenAiItineraryPlanConfigured.mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "development");

    const response = await POST(createRequest({ tripId }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      message: "AI 동선 추천은 최대 14일 여행까지 만들 수 있어요.",
    });
    expect(mocks.createMockAiItineraryPlan).not.toHaveBeenCalled();
    expect(mocks.generateOpenAiItineraryPlan).not.toHaveBeenCalled();
  });
});
