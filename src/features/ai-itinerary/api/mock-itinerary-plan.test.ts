import { describe, expect, it } from "vitest";

import { createMockAiItineraryPlan } from "@/features/ai-itinerary/api/mock-itinerary-plan";

describe("createMockAiItineraryPlan", () => {
  it("creates a deterministic preview for every trip day without naming unverified places", () => {
    const plan = createMockAiItineraryPlan({
      destination: "일본 · 후쿠오카",
      endDate: "2026-10-12",
      startDate: "2026-10-10",
    });

    expect(plan).toMatchObject({
      overview: "일본 · 후쿠오카 3일 여행을 위한 개발용 미리보기 동선이에요.",
      routeRationale: expect.stringContaining("고정 예시"),
    });
    expect(plan.days.map((day) => day.date)).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(plan.days[0]?.stops).toEqual([
      expect.objectContaining({ area: "일본 · 후쿠오카 중심 권역", period: "morning" }),
      expect.objectContaining({ area: "인근 산책·식사 권역", period: "afternoon" }),
      expect.objectContaining({ area: "숙소 주변 휴식 권역", period: "evening" }),
    ]);
  });
});
