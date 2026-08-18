import type { Trip } from "@/entities/trip/model/trip";
import {
  aiItineraryPlanSchema,
  getAiItineraryTripDates,
  type AiItineraryPlan,
} from "@/features/ai-itinerary/model/ai-itinerary-plan";

const dayThemes = [
  "여행지의 첫인상을 만나는 날",
  "관심 권역을 천천히 둘러보는 날",
  "좋아하는 분위기를 다시 찾는 날",
] as const;

function getDayTheme(dayIndex: number) {
  return dayThemes[dayIndex % dayThemes.length];
}

export function createMockAiItineraryPlan(
  trip: Pick<Trip, "destination" | "endDate" | "startDate">,
): AiItineraryPlan {
  const tripDates = getAiItineraryTripDates(trip);
  const destination = trip.destination.trim();

  return aiItineraryPlanSchema.parse({
    days: tripDates.map((date, dayIndex) => ({
      date,
      routeTip:
        "같은 권역에서 먼저 장소를 고른 뒤, 실제 위치와 운영 정보는 장소 검색으로 확인해 보세요.",
      stops: [
        {
          area: `${destination} 중심 권역`,
          description: "하루를 시작할 대표 장소를 검색해 첫 동선을 정해 보세요.",
          period: "morning",
        },
        {
          area: "인근 산책·식사 권역",
          description: "오전과 가까운 장소를 이어 이동을 줄여 보세요.",
          period: "afternoon",
        },
        {
          area: "숙소 주변 휴식 권역",
          description: "저녁에는 예약과 이동 부담을 고려해 여유 있게 마무리해 보세요.",
          period: "evening",
        },
      ],
      theme: getDayTheme(dayIndex),
    })),
    overview: `${destination} ${tripDates.length}일 여행을 위한 개발용 미리보기 동선이에요.`,
    routeRationale:
      "실제 장소를 저장하기 전, 오전·오후·저녁 흐름을 먼저 살펴볼 수 있도록 만든 고정 예시입니다.",
  });
}
