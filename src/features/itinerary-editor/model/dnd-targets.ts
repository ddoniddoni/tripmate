import type { ItineraryDocument } from "@/entities/itinerary/model/trip-itinerary";

export const dayDropTargetPrefix = "day-drop-target:";

export function getDayDropTargetId(dayId: string) {
  return `${dayDropTargetPrefix}${dayId}`;
}

export function getDayIdFromDropTarget(
  targetId: string | number | undefined,
  itinerary: ItineraryDocument,
) {
  if (typeof targetId !== "string" || !targetId.startsWith(dayDropTargetPrefix)) {
    return undefined;
  }

  const dayId = targetId.slice(dayDropTargetPrefix.length);
  return itinerary.days[dayId] ? dayId : undefined;
}

export function getDragHandleId(itemId: string) {
  return `drag-handle-${itemId}`;
}

export function getTimelineItemId(itemId: string) {
  return `timeline-item:${itemId}`;
}
