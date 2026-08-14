import type {
  ItineraryItem,
  TripItinerary,
} from "@/entities/itinerary/model/trip-itinerary";
import { tripItinerarySchema } from "@/entities/itinerary/model/trip-itinerary";

export type ItineraryMutationErrorCode =
  | "day-not-found"
  | "item-already-exists"
  | "item-not-found"
  | "item-not-in-day"
  | "invalid-position"
  | "invalid-document";

export type ItineraryMutationResult =
  | { success: true; data: TripItinerary }
  | { success: false; code: ItineraryMutationErrorCode; message: string };

type AddItineraryItemInput = {
  item: ItineraryItem;
  position?: number;
};

type UpdateItineraryItemInput = {
  itemId: string;
  changes: Partial<Pick<ItineraryItem, "durationMinutes" | "note" | "place" | "startTime">> & {
    updatedAt: string;
  };
};

type ReorderItineraryItemInput = {
  dayId: string;
  itemId: string;
  toIndex: number;
};

type MoveItineraryItemInput = {
  destinationDayId: string;
  itemId: string;
  sourceDayId: string;
  toIndex: number;
};

function mutationError(
  code: ItineraryMutationErrorCode,
  message: string,
): ItineraryMutationResult {
  return { success: false, code, message };
}

function validateMutation(candidate: unknown): ItineraryMutationResult {
  const result = tripItinerarySchema.safeParse(candidate);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return mutationError(
    "invalid-document",
    result.error.issues[0]?.message ?? "일정 문서가 유효하지 않습니다.",
  );
}

export function addItineraryItem(
  current: TripItinerary,
  { item, position }: AddItineraryItemInput,
): ItineraryMutationResult {
  const day = current.itinerary.days[item.dayId];

  if (!day) {
    return mutationError("day-not-found", "장소를 추가할 날짜를 찾을 수 없습니다.");
  }

  if (current.itinerary.items[item.id]) {
    return mutationError("item-already-exists", "같은 ID의 일정 아이템이 이미 있습니다.");
  }

  const insertionIndex = position ?? day.itemIds.length;

  if (!Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > day.itemIds.length) {
    return mutationError("invalid-position", "장소를 추가할 위치가 유효하지 않습니다.");
  }

  const itemIds = [...day.itemIds];
  itemIds.splice(insertionIndex, 0, item.id);

  return validateMutation({
    trip: current.trip,
    itinerary: {
      ...current.itinerary,
      days: {
        ...current.itinerary.days,
        [day.id]: { ...day, itemIds },
      },
      items: {
        ...current.itinerary.items,
        [item.id]: item,
      },
    },
  });
}

export function updateItineraryItem(
  current: TripItinerary,
  { itemId, changes }: UpdateItineraryItemInput,
): ItineraryMutationResult {
  const item = current.itinerary.items[itemId];

  if (!item) {
    return mutationError("item-not-found", "수정할 일정 아이템을 찾을 수 없습니다.");
  }

  return validateMutation({
    trip: current.trip,
    itinerary: {
      ...current.itinerary,
      items: {
        ...current.itinerary.items,
        [itemId]: { ...item, ...changes },
      },
    },
  });
}

export function removeItineraryItem(
  current: TripItinerary,
  itemId: string,
): ItineraryMutationResult {
  const item = current.itinerary.items[itemId];

  if (!item) {
    return mutationError("item-not-found", "삭제할 일정 아이템을 찾을 수 없습니다.");
  }

  const day = current.itinerary.days[item.dayId];

  if (!day) {
    return mutationError("day-not-found", "일정 아이템이 속한 날짜를 찾을 수 없습니다.");
  }

  if (!day.itemIds.includes(itemId)) {
    return mutationError("item-not-in-day", "일정 아이템이 지정된 날짜에 없습니다.");
  }

  const items = { ...current.itinerary.items };
  delete items[itemId];

  return validateMutation({
    trip: current.trip,
    itinerary: {
      ...current.itinerary,
      days: {
        ...current.itinerary.days,
        [day.id]: {
          ...day,
          itemIds: day.itemIds.filter((currentItemId) => currentItemId !== itemId),
        },
      },
      items,
    },
  });
}

export function reorderItineraryItem(
  current: TripItinerary,
  { dayId, itemId, toIndex }: ReorderItineraryItemInput,
): ItineraryMutationResult {
  const day = current.itinerary.days[dayId];

  if (!day) {
    return mutationError("day-not-found", "순서를 변경할 날짜를 찾을 수 없습니다.");
  }

  const fromIndex = day.itemIds.indexOf(itemId);

  if (fromIndex < 0) {
    return mutationError("item-not-in-day", "순서를 변경할 아이템이 지정된 날짜에 없습니다.");
  }

  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= day.itemIds.length) {
    return mutationError("invalid-position", "이동할 위치가 유효하지 않습니다.");
  }

  if (fromIndex === toIndex) {
    return { success: true, data: current };
  }

  const itemIds = [...day.itemIds];
  const [movedItemId] = itemIds.splice(fromIndex, 1);

  if (!movedItemId) {
    return mutationError("item-not-found", "순서를 변경할 일정 아이템을 찾을 수 없습니다.");
  }

  itemIds.splice(toIndex, 0, movedItemId);

  return validateMutation({
    trip: current.trip,
    itinerary: {
      ...current.itinerary,
      days: {
        ...current.itinerary.days,
        [day.id]: { ...day, itemIds },
      },
    },
  });
}

export function moveItineraryItem(
  current: TripItinerary,
  { destinationDayId, itemId, sourceDayId, toIndex }: MoveItineraryItemInput,
): ItineraryMutationResult {
  const item = current.itinerary.items[itemId];

  if (!item) {
    return mutationError("item-not-found", "이동할 일정 아이템을 찾을 수 없습니다.");
  }

  const sourceDay = current.itinerary.days[sourceDayId];
  const destinationDay = current.itinerary.days[destinationDayId];

  if (!sourceDay || !destinationDay) {
    return mutationError("day-not-found", "일정을 이동할 날짜를 찾을 수 없습니다.");
  }

  if (item.dayId !== sourceDayId || !sourceDay.itemIds.includes(itemId)) {
    return mutationError("item-not-in-day", "이동할 일정이 원래 날짜에 없습니다.");
  }

  if (sourceDayId === destinationDayId) {
    return reorderItineraryItem(current, { dayId: sourceDayId, itemId, toIndex });
  }

  if (
    !Number.isInteger(toIndex) ||
    toIndex < 0 ||
    toIndex > destinationDay.itemIds.length
  ) {
    return mutationError("invalid-position", "이동할 위치가 유효하지 않습니다.");
  }

  const destinationItemIds = [...destinationDay.itemIds];
  destinationItemIds.splice(toIndex, 0, itemId);

  return validateMutation({
    trip: current.trip,
    itinerary: {
      ...current.itinerary,
      days: {
        ...current.itinerary.days,
        [sourceDayId]: {
          ...sourceDay,
          itemIds: sourceDay.itemIds.filter((currentItemId) => currentItemId !== itemId),
        },
        [destinationDayId]: {
          ...destinationDay,
          itemIds: destinationItemIds,
        },
      },
      items: {
        ...current.itinerary.items,
        [itemId]: { ...item, dayId: destinationDayId },
      },
    },
  });
}
