import { describe, expect, it } from "vitest";

import {
  getAiItineraryPlanJsonSchema,
  type AiItineraryPlan,
  validateAiItineraryPlanForTrip,
} from "@/features/ai-itinerary/model/ai-itinerary-plan";

const plan: AiItineraryPlan = {
  days: [
    {
      date: "2026-10-10",
      routeTip: "하루 동안 같은 권역을 중심으로 이동해 보세요.",
      stops: [
        { area: "해운대", description: "바다를 따라 천천히 시작해 보세요.", period: "morning" },
        { area: "광안리", description: "해 질 무렵 풍경을 즐겨 보세요.", period: "evening" },
      ],
      theme: "바다와 야경을 잇는 첫날",
    },
    {
      date: "2026-10-11",
      routeTip: "남쪽 권역에서 다음 일정으로 넘어가면 동선이 편해요.",
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

describe("AI itinerary plan model", () => {
  it("accepts a plan that has exactly one route draft for every trip day", () => {
    expect(
      validateAiItineraryPlanForTrip(plan, {
        endDate: "2026-10-11",
        startDate: "2026-10-10",
      }),
    ).toEqual({ data: plan, success: true });
  });

  it("rejects a draft with dates that do not match the actual trip range", () => {
    expect(
      validateAiItineraryPlanForTrip(
        { ...plan, days: [{ ...plan.days[0], date: "2026-10-09" }, plan.days[1]] },
        { endDate: "2026-10-11", startDate: "2026-10-10" },
      ),
    ).toEqual({
      message: "여행 날짜 순서가 맞지 않는 동선 초안이에요. 다시 만들어 주세요.",
      success: false,
    });
  });

  it("creates a strict output schema with the expected day count", () => {
    const schema = getAiItineraryPlanJsonSchema(2);

    expect(schema.properties.days).toMatchObject({ maxItems: 2, minItems: 2, type: "array" });
    expect(schema.properties.days.items.properties.stops.items).toMatchObject({
      additionalProperties: false,
      type: "object",
    });
  });
});
