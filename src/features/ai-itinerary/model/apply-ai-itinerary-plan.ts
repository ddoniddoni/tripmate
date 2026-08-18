import {
  updateTripDayNote,
  type ItineraryMutationErrorCode,
} from "@/entities/itinerary/model/mutations";
import type { TripItinerary } from "@/entities/itinerary/model/trip-itinerary";
import type {
  AiItineraryPlan,
  AiItineraryStopPeriod,
} from "@/features/ai-itinerary/model/ai-itinerary-plan";

type AiItineraryPlanDay = AiItineraryPlan["days"][number];

const periodLabels: Record<AiItineraryStopPeriod, string> = {
  afternoon: "오후",
  evening: "저녁",
  morning: "오전",
};

export type AiItineraryPlanImportFeedback =
  | {
      success: true;
      importedDayCount: number;
      preservedDayCount: number;
      unmatchedDayCount: number;
    }
  | { success: false; message: string };

export type AiItineraryPlanImportMutationResult =
  | ({
      success: true;
      data: TripItinerary;
      importedDayCount: number;
      preservedDayCount: number;
      unmatchedDayCount: number;
    })
  | { success: false; code: ItineraryMutationErrorCode; message: string };

export function createAiItineraryDayNote(day: AiItineraryPlanDay) {
  const stops = day.stops.map(
    (stop) => `- ${periodLabels[stop.period]} · ${stop.area}: ${stop.description}`,
  );

  return [
    `[AI 동선 초안] ${day.theme}`,
    ...stops,
    `동선 팁 · ${day.routeTip}`,
    "정확한 장소와 운영 정보는 장소 검색으로 확인해 주세요.",
  ].join("\n");
}

export function applyAiItineraryPlanToDayNotes(
  current: TripItinerary,
  plan: AiItineraryPlan,
): AiItineraryPlanImportMutationResult {
  const dayIdsByDate = new Map(
    current.itinerary.dayOrder.flatMap((dayId) => {
      const day = current.itinerary.days[dayId];

      return day ? [[day.date, day.id] as const] : [];
    }),
  );
  let next = current;
  let importedDayCount = 0;
  let preservedDayCount = 0;
  let unmatchedDayCount = 0;

  for (const planDay of plan.days) {
    const dayId = dayIdsByDate.get(planDay.date);
    const day = dayId ? next.itinerary.days[dayId] : undefined;

    if (!day) {
      unmatchedDayCount += 1;
      continue;
    }

    if (day.note?.trim()) {
      preservedDayCount += 1;
      continue;
    }

    const updated = updateTripDayNote(next, {
      dayId: day.id,
      note: createAiItineraryDayNote(planDay),
    });

    if (!updated.success) {
      return updated;
    }

    next = updated.data;
    importedDayCount += 1;
  }

  return {
    success: true,
    data: next,
    importedDayCount,
    preservedDayCount,
    unmatchedDayCount,
  };
}
