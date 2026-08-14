import type { ItineraryItem } from "@/entities/itinerary/model/trip-itinerary";

export type ItineraryScheduleEntry = Pick<
  ItineraryItem,
  "durationMinutes" | "id" | "startTime"
>;

export type ItineraryScheduleConflict = {
  itemIds: readonly [string, string];
};

type ScheduledInterval = {
  endMinutes: number;
  id: string;
  startMinutes: number;
};

function getScheduledInterval(item: ItineraryScheduleEntry): ScheduledInterval | null {
  if (!item.startTime || !item.durationMinutes) {
    return null;
  }

  const [hours, minutes] = item.startTime.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    item.durationMinutes < 1
  ) {
    return null;
  }

  const startMinutes = hours * 60 + minutes;

  return {
    endMinutes: startMinutes + item.durationMinutes,
    id: item.id,
    startMinutes,
  };
}

export function getItineraryScheduleConflicts(
  items: readonly ItineraryScheduleEntry[],
): ItineraryScheduleConflict[] {
  const intervals = items.flatMap((item) => {
    const interval = getScheduledInterval(item);

    return interval ? [interval] : [];
  });
  const conflicts: ItineraryScheduleConflict[] = [];

  for (let currentIndex = 0; currentIndex < intervals.length; currentIndex += 1) {
    const current = intervals[currentIndex];

    if (!current) {
      continue;
    }

    for (let nextIndex = currentIndex + 1; nextIndex < intervals.length; nextIndex += 1) {
      const next = intervals[nextIndex];

      if (!next) {
        continue;
      }

      // An end time equal to the next start time leaves no overlap.
      if (current.startMinutes < next.endMinutes && next.startMinutes < current.endMinutes) {
        conflicts.push({ itemIds: [current.id, next.id] });
      }
    }
  }

  return conflicts;
}
