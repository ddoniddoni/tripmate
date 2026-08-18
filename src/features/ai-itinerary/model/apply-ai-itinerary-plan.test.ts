import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  applyAiItineraryPlanToDayNotes,
  createAiItineraryDayNote,
} from "@/features/ai-itinerary/model/apply-ai-itinerary-plan";
import type { AiItineraryPlan } from "@/features/ai-itinerary/model/ai-itinerary-plan";

const plan: AiItineraryPlan = {
  days: [
    {
      date: "2026-04-18",
      routeTip: "동쪽 이동은 한 번에 이어 보세요.",
      stops: [
        { area: "제주시", description: "아침 식사를 먼저 정해 보세요.", period: "morning" },
        { area: "함덕", description: "바다 근처에서 여유를 즐겨 보세요.", period: "afternoon" },
      ],
      theme: "동쪽 해안을 따라가는 첫날",
    },
    {
      date: "2026-04-19",
      routeTip: "가까운 곳부터 천천히 둘러보세요.",
      stops: [
        { area: "성산", description: "아침 풍경을 둘러보세요.", period: "morning" },
        { area: "표선", description: "해안 산책을 이어 보세요.", period: "afternoon" },
      ],
      theme: "동남쪽 풍경을 즐기는 둘째 날",
    },
    {
      date: "2026-04-25",
      routeTip: "여행 날짜를 다시 확인해 보세요.",
      stops: [
        { area: "제주", description: "첫 장소를 찾아보세요.", period: "morning" },
        { area: "제주", description: "다음 장소를 찾아보세요.", period: "afternoon" },
      ],
      theme: "여행 기간 밖의 날짜",
    },
  ],
  overview: "제주 동선 초안입니다.",
  routeRationale: "가까운 권역을 함께 둘러보도록 구성했습니다.",
};

describe("applyAiItineraryPlanToDayNotes", () => {
  it("imports each matching plan day as a shared day note without creating unverified places", () => {
    const result = applyAiItineraryPlanToDayNotes(jejuTrip, plan);

    expect(result).toMatchObject({
      success: true,
      importedDayCount: 2,
      preservedDayCount: 0,
      unmatchedDayCount: 1,
    });
    if (!result.success) {
      throw new Error(result.message);
    }

    expect(result.data.itinerary.days["jeju-day-1"]?.note).toBe(createAiItineraryDayNote(plan.days[0]));
    expect(result.data.itinerary.days["jeju-day-2"]?.note).toBe(createAiItineraryDayNote(plan.days[1]));
    expect(result.data.itinerary.items).toEqual(jejuTrip.itinerary.items);
    expect(jejuTrip.itinerary.days["jeju-day-1"]?.note).toBeUndefined();
  });

  it("protects an existing day memo when a new AI draft is applied", () => {
    const tripWithMemo = structuredClone(jejuTrip);
    tripWithMemo.itinerary.days["jeju-day-1"] = {
      ...tripWithMemo.itinerary.days["jeju-day-1"],
      note: "사용자가 직접 적은 메모",
    };
    const result = applyAiItineraryPlanToDayNotes(tripWithMemo, plan);

    expect(result).toMatchObject({
      success: true,
      importedDayCount: 1,
      preservedDayCount: 1,
      unmatchedDayCount: 1,
    });
    if (!result.success) {
      throw new Error(result.message);
    }

    expect(result.data.itinerary.days["jeju-day-1"]?.note).toBe("사용자가 직접 적은 메모");
    expect(result.data.itinerary.days["jeju-day-2"]?.note).toBe(createAiItineraryDayNote(plan.days[1]));
  });
});
