import { afterEach, describe, expect, it, vi } from "vitest";

import { requestAiItineraryPlan } from "@/features/ai-itinerary/api/ai-itinerary-api-adapter";

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
  ],
  overview: "바다를 따라 둘러보는 부산 초안이에요.",
  routeRationale: "가까운 권역을 하루에 묶어 이동을 줄였어요.",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestAiItineraryPlan", () => {
  it("posts only the trip ID and returns a validated route plan", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ plan }), { headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAiItineraryPlan("d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8")).resolves.toEqual(
      plan,
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/ai-itinerary", {
      body: JSON.stringify({ tripId: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8" }),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("shows the server's Korean configuration guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "AI 동선 추천 설정이 아직 완료되지 않았습니다." }), {
          status: 503,
        }),
      ),
    );

    await expect(requestAiItineraryPlan("d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8")).rejects.toThrow(
      "AI 동선 추천 설정이 아직 완료되지 않았습니다.",
    );
  });

  it("does not accept an untrusted malformed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ plan: { overview: "날짜가 빠진 결과" } }), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(requestAiItineraryPlan("d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8")).rejects.toThrow(
      "AI 동선 결과를 처리하지 못했습니다. 다시 만들어 주세요.",
    );
  });
});
