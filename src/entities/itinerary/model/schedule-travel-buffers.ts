import type { ItineraryItem } from "@/entities/itinerary/model/trip-itinerary";

export type ItineraryTravelBuffer = {
  availableMinutes: number;
  itemIds: readonly [string, string];
  requiredMinutes: number;
  status: "enough-time" | "not-enough-time";
};

type ItineraryTravelLeg = {
  durationSeconds: number;
};

function getMinutesFromLocalTime(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function getRequiredTravelMinutes(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return null;
  }

  return Math.max(1, Math.ceil(durationSeconds / 60));
}

export function getItineraryTravelBuffers(
  items: readonly Pick<ItineraryItem, "durationMinutes" | "id" | "startTime">[],
  legs: readonly ItineraryTravelLeg[],
): ItineraryTravelBuffer[] {
  const buffers: ItineraryTravelBuffer[] = [];

  for (let index = 0; index < legs.length; index += 1) {
    const fromItem = items[index];
    const toItem = items[index + 1];
    const leg = legs[index];

    if (!fromItem || !toItem || !leg || !fromItem.durationMinutes) {
      continue;
    }

    const fromStartMinutes = getMinutesFromLocalTime(fromItem.startTime);
    const toStartMinutes = getMinutesFromLocalTime(toItem.startTime);
    const requiredMinutes = getRequiredTravelMinutes(leg.durationSeconds);

    if (fromStartMinutes === null || toStartMinutes === null || requiredMinutes === null) {
      continue;
    }

    const availableMinutes = toStartMinutes - (fromStartMinutes + fromItem.durationMinutes);

    // Schedule overlaps already have a dedicated warning. Avoid duplicating it as a route warning.
    if (availableMinutes < 0) {
      continue;
    }

    buffers.push({
      availableMinutes,
      itemIds: [fromItem.id, toItem.id],
      requiredMinutes,
      status: availableMinutes >= requiredMinutes ? "enough-time" : "not-enough-time",
    });
  }

  return buffers;
}
