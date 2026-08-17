import type { Trip } from "@/entities/trip/model/trip";
import { calendarDateToUtcDate, calendarDateSchema } from "@/shared/lib/calendar-date";
import { z } from "@/shared/lib/zod";

const itineraryStopPeriodSchema = z.enum(["morning", "afternoon", "evening"]);

export const aiItineraryPlanRequestSchema = z.object({
  tripId: z.uuid(),
});

export const aiItineraryStopSchema = z.object({
  area: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(220),
  period: itineraryStopPeriodSchema,
});

export const aiItineraryPlanDaySchema = z.object({
  date: calendarDateSchema,
  routeTip: z.string().trim().min(1).max(220),
  stops: z.array(aiItineraryStopSchema).min(2).max(3),
  theme: z.string().trim().min(1).max(100),
});

export const aiItineraryPlanSchema = z.object({
  days: z.array(aiItineraryPlanDaySchema).min(1).max(14),
  overview: z.string().trim().min(1).max(500),
  routeRationale: z.string().trim().min(1).max(300),
});

export const aiItineraryPlanResponseSchema = z.object({
  plan: aiItineraryPlanSchema,
});

export type AiItineraryPlan = z.infer<typeof aiItineraryPlanSchema>;
export type AiItineraryPlanRequest = z.infer<typeof aiItineraryPlanRequestSchema>;
export type AiItineraryStopPeriod = z.infer<typeof itineraryStopPeriodSchema>;

function getTripDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const end = calendarDateToUtcDate(endDate);

  for (let current = calendarDateToUtcDate(startDate); current <= end; ) {
    dates.push(current.toISOString().slice(0, 10));
    current = new Date(current);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export function validateAiItineraryPlanForTrip(
  plan: AiItineraryPlan,
  trip: Pick<Trip, "endDate" | "startDate">,
) {
  const tripDates = getTripDates(trip.startDate, trip.endDate);

  if (tripDates.length > 14) {
    return {
      message: "AI 동선 추천은 최대 14일 여행까지 만들 수 있어요.",
      success: false as const,
    };
  }

  if (plan.days.length !== tripDates.length) {
    return {
      message: "여행 기간과 맞지 않는 동선 초안이에요. 다시 만들어 주세요.",
      success: false as const,
    };
  }

  const hasExpectedDates = plan.days.every((day, index) => day.date === tripDates[index]);

  if (!hasExpectedDates) {
    return {
      message: "여행 날짜 순서가 맞지 않는 동선 초안이에요. 다시 만들어 주세요.",
      success: false as const,
    };
  }

  return { data: plan, success: true as const };
}

export function getAiItineraryPlanJsonSchema(dayCount: number) {
  return {
    additionalProperties: false,
    properties: {
      days: {
        items: {
          additionalProperties: false,
          properties: {
            date: { type: "string" },
            routeTip: { type: "string" },
            stops: {
              items: {
                additionalProperties: false,
                properties: {
                  area: { type: "string" },
                  description: { type: "string" },
                  period: { enum: ["morning", "afternoon", "evening"], type: "string" },
                },
                required: ["period", "area", "description"],
                type: "object",
              },
              maxItems: 3,
              minItems: 2,
              type: "array",
            },
            theme: { type: "string" },
          },
          required: ["date", "theme", "stops", "routeTip"],
          type: "object",
        },
        maxItems: dayCount,
        minItems: dayCount,
        type: "array",
      },
      overview: { type: "string" },
      routeRationale: { type: "string" },
    },
    required: ["overview", "routeRationale", "days"],
    type: "object",
  } as const;
}

export function getAiItineraryTripDates(trip: Pick<Trip, "endDate" | "startDate">) {
  return getTripDates(trip.startDate, trip.endDate);
}
