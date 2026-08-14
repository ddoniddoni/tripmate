import type { Trip } from "@/entities/trip/model/trip";
import {
  parseTripItinerary,
  type TripItinerary,
} from "@/entities/itinerary/model/trip-itinerary";
import { calendarDateToUtcDate } from "@/shared/lib/calendar-date";

function toCalendarDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function createEmptyTripItinerary(trip: Trip): TripItinerary {
  const startDate = calendarDateToUtcDate(trip.startDate);
  const endDate = calendarDateToUtcDate(trip.endDate);
  const days: TripItinerary["itinerary"]["days"] = {};
  const dayOrder: string[] = [];

  for (let dayIndex = 0, currentDate = startDate; currentDate <= endDate; dayIndex += 1) {
    const dayId = `${trip.id}-day-${dayIndex + 1}`;

    days[dayId] = {
      date: toCalendarDate(currentDate),
      id: dayId,
      itemIds: [],
      tripId: trip.id,
    };
    dayOrder.push(dayId);
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1_000);
  }

  return parseTripItinerary({
    itinerary: {
      dayOrder,
      days,
      items: {},
    },
    trip,
  });
}
