import { z } from "@/shared/lib/zod";

import { placeSnapshotSchema } from "@/entities/place/model/place-snapshot";
import { tripSchema } from "@/entities/trip/model/trip";
import { calendarDateSchema } from "@/shared/lib/calendar-date";

const stableIdSchema = z.string().trim().min(1).max(100);
const localTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm 형식의 유효한 현지 시간이어야 합니다.");

export const tripDaySchema = z.object({
  id: stableIdSchema,
  tripId: stableIdSchema,
  date: calendarDateSchema,
  itemIds: z.array(stableIdSchema),
});

export const itineraryItemSchema = z.object({
  id: stableIdSchema,
  dayId: stableIdSchema,
  place: placeSnapshotSchema,
  startTime: localTimeSchema.optional(),
  durationMinutes: z
    .number()
    .int("소요 시간은 정수(분)여야 합니다.")
    .min(1, "소요 시간은 1분 이상이어야 합니다.")
    .max(1_440, "소요 시간은 24시간 이하여야 합니다.")
    .optional(),
  note: z.string().trim().max(2_000).optional(),
  createdBy: stableIdSchema,
  updatedAt: z.iso.datetime({ offset: true }),
});

export const itineraryDocumentSchema = z.object({
  dayOrder: z.array(stableIdSchema).min(1),
  days: z.record(stableIdSchema, tripDaySchema),
  items: z.record(stableIdSchema, itineraryItemSchema),
});

export const tripItinerarySchema = z
  .object({
    trip: tripSchema,
    itinerary: itineraryDocumentSchema,
  })
  .superRefine(({ trip, itinerary }, context) => {
    const orderedDayIds = new Set<string>();

    itinerary.dayOrder.forEach((dayId, dayIndex) => {
      if (orderedDayIds.has(dayId)) {
        context.addIssue({
          code: "custom",
          message: `날짜 ID '${dayId}'가 dayOrder에 중복되었습니다.`,
          path: ["itinerary", "dayOrder", dayIndex],
        });
      }

      orderedDayIds.add(dayId);

      if (!itinerary.days[dayId]) {
        context.addIssue({
          code: "custom",
          message: `dayOrder가 존재하지 않는 날짜 '${dayId}'를 참조합니다.`,
          path: ["itinerary", "dayOrder", dayIndex],
        });
      }
    });

    const referencedItemIds = new Set<string>();
    const usedDates = new Set<string>();

    Object.entries(itinerary.days).forEach(([dayKey, day]) => {
      const dayPath: PropertyKey[] = ["itinerary", "days", dayKey];

      if (day.id !== dayKey) {
        context.addIssue({
          code: "custom",
          message: `날짜 레코드 키 '${dayKey}'와 날짜 ID '${day.id}'가 일치하지 않습니다.`,
          path: [...dayPath, "id"],
        });
      }

      if (!orderedDayIds.has(dayKey)) {
        context.addIssue({
          code: "custom",
          message: `날짜 '${dayKey}'가 dayOrder에 포함되지 않았습니다.`,
          path: dayPath,
        });
      }

      if (day.tripId !== trip.id) {
        context.addIssue({
          code: "custom",
          message: `날짜 '${dayKey}'의 tripId가 여행 ID와 일치하지 않습니다.`,
          path: [...dayPath, "tripId"],
        });
      }

      if (day.date < trip.startDate || day.date > trip.endDate) {
        context.addIssue({
          code: "custom",
          message: `날짜 '${day.date}'가 여행 기간 밖에 있습니다.`,
          path: [...dayPath, "date"],
        });
      }

      if (usedDates.has(day.date)) {
        context.addIssue({
          code: "custom",
          message: `여행 날짜 '${day.date}'에 둘 이상의 일정 날짜가 있습니다.`,
          path: [...dayPath, "date"],
        });
      }

      usedDates.add(day.date);

      day.itemIds.forEach((itemId, itemIndex) => {
        const itemPath: PropertyKey[] = [...dayPath, "itemIds", itemIndex];

        if (referencedItemIds.has(itemId)) {
          context.addIssue({
            code: "custom",
            message: `일정 아이템 '${itemId}'가 둘 이상의 위치에 포함되었습니다.`,
            path: itemPath,
          });
        }

        referencedItemIds.add(itemId);
        const item = itinerary.items[itemId];

        if (!item) {
          context.addIssue({
            code: "custom",
            message: `날짜 '${dayKey}'가 존재하지 않는 아이템 '${itemId}'를 참조합니다.`,
            path: itemPath,
          });
          return;
        }

        if (item.dayId !== day.id) {
          context.addIssue({
            code: "custom",
            message: `아이템 '${itemId}'의 dayId가 포함된 날짜와 일치하지 않습니다.`,
            path: ["itinerary", "items", itemId, "dayId"],
          });
        }
      });
    });

    Object.entries(itinerary.items).forEach(([itemKey, item]) => {
      const itemPath: PropertyKey[] = ["itinerary", "items", itemKey];

      if (item.id !== itemKey) {
        context.addIssue({
          code: "custom",
          message: `아이템 레코드 키 '${itemKey}'와 아이템 ID '${item.id}'가 일치하지 않습니다.`,
          path: [...itemPath, "id"],
        });
      }

      if (!referencedItemIds.has(itemKey)) {
        context.addIssue({
          code: "custom",
          message: `아이템 '${itemKey}'가 어떤 날짜에도 포함되지 않았습니다.`,
          path: itemPath,
        });
      }
    });
  });

export type TripDay = z.infer<typeof tripDaySchema>;
export type ItineraryItem = z.infer<typeof itineraryItemSchema>;
export type ItineraryDocument = z.infer<typeof itineraryDocumentSchema>;
export type TripItinerary = z.infer<typeof tripItinerarySchema>;

export type ItineraryValidationIssue = {
  message: string;
  path: string;
};

export type ItineraryValidationResult =
  | { success: true; data: TripItinerary }
  | { success: false; issues: ItineraryValidationIssue[] };

export function validateTripItinerary(input: unknown): ItineraryValidationResult {
  const result = tripItinerarySchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path.join("."),
    })),
  };
}

export function parseTripItinerary(input: unknown) {
  return tripItinerarySchema.parse(input);
}
