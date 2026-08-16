import type {
  ItineraryItem,
  PlaceSuggestion,
  TripDay,
  TripItinerary,
} from "@/entities/itinerary/model/trip-itinerary";
import { tripItinerarySchema } from "@/entities/itinerary/model/trip-itinerary";
import { calendarDateToUtcDate } from "@/shared/lib/calendar-date";

export type ItineraryMutationErrorCode =
  | "day-not-found"
  | "item-already-exists"
  | "item-not-found"
  | "item-not-in-day"
  | "invalid-position"
  | "invalid-document"
  | "place-suggestion-already-exists"
  | "place-suggestion-not-found"
  | "scheduled-day-outside-range";

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

type SortItineraryItemsByStartTimeInput = {
  dayId: string;
};

type DuplicateItineraryItemInput = {
  createdBy: string;
  itemId: string;
  newItemId: string;
  updatedAt: string;
};

type MoveItineraryItemInput = {
  destinationDayId: string;
  itemId: string;
  sourceDayId: string;
  toIndex: number;
};

type ResizeTripItineraryInput = {
  endDate: string;
  startDate: string;
};

type UpdateTripDayNoteInput = {
  dayId: string;
  note?: string;
};

type AddPlaceSuggestionInput = {
  suggestion: PlaceSuggestion;
};

type PromotePlaceSuggestionInput = {
  createdBy: string;
  newItemId: string;
  suggestionId: string;
  updatedAt: string;
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

function getCalendarDatesInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let currentDate = calendarDateToUtcDate(startDate);
  const finalDate = calendarDateToUtcDate(endDate);

  while (currentDate <= finalDate) {
    dates.push(currentDate.toISOString().slice(0, 10));
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1_000);
  }

  return dates;
}

function createAddedDayId(tripId: string, date: string, usedDayIds: Set<string>) {
  const baseId = `${tripId}-day-${date.replaceAll("-", "")}`;
  let candidateId = baseId;
  let suffix = 2;

  while (usedDayIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedDayIds.add(candidateId);
  return candidateId;
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

export function updateTripDayNote(
  current: TripItinerary,
  { dayId, note }: UpdateTripDayNoteInput,
): ItineraryMutationResult {
  const day = current.itinerary.days[dayId];

  if (!day) {
    return mutationError("day-not-found", "메모를 저장할 날짜를 찾을 수 없습니다.");
  }

  return validateMutation({
    trip: current.trip,
    itinerary: {
      ...current.itinerary,
      days: {
        ...current.itinerary.days,
        [dayId]: { ...day, note },
      },
    },
  });
}

export function addPlaceSuggestion(
  current: TripItinerary,
  { suggestion }: AddPlaceSuggestionInput,
): ItineraryMutationResult {
  if (!current.itinerary.days[suggestion.dayId]) {
    return mutationError("day-not-found", "장소를 제안할 날짜를 찾을 수 없습니다.");
  }

  if (current.itinerary.placeSuggestions[suggestion.id]) {
    return mutationError(
      "place-suggestion-already-exists",
      "같은 ID의 장소 제안이 이미 있습니다.",
    );
  }

  return validateMutation({
    trip: current.trip,
    itinerary: {
      ...current.itinerary,
      placeSuggestions: {
        ...current.itinerary.placeSuggestions,
        [suggestion.id]: suggestion,
      },
    },
  });
}

export function removePlaceSuggestion(
  current: TripItinerary,
  suggestionId: string,
): ItineraryMutationResult {
  if (!current.itinerary.placeSuggestions[suggestionId]) {
    return mutationError("place-suggestion-not-found", "삭제할 장소 제안을 찾을 수 없습니다.");
  }

  const placeSuggestions = { ...current.itinerary.placeSuggestions };
  delete placeSuggestions[suggestionId];

  return validateMutation({
    trip: current.trip,
    itinerary: {
      ...current.itinerary,
      placeSuggestions,
    },
  });
}

export function promotePlaceSuggestion(
  current: TripItinerary,
  { createdBy, newItemId, suggestionId, updatedAt }: PromotePlaceSuggestionInput,
): ItineraryMutationResult {
  const suggestion = current.itinerary.placeSuggestions[suggestionId];

  if (!suggestion) {
    return mutationError("place-suggestion-not-found", "일정에 추가할 장소 제안을 찾을 수 없습니다.");
  }

  const addedItem = addItineraryItem(current, {
    item: {
      createdBy,
      dayId: suggestion.dayId,
      id: newItemId,
      note: suggestion.note,
      place: { ...suggestion.place },
      updatedAt,
    },
  });

  if (!addedItem.success) {
    return addedItem;
  }

  const placeSuggestions = { ...addedItem.data.itinerary.placeSuggestions };
  delete placeSuggestions[suggestionId];

  return validateMutation({
    trip: addedItem.data.trip,
    itinerary: {
      ...addedItem.data.itinerary,
      placeSuggestions,
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

export function duplicateItineraryItem(
  current: TripItinerary,
  { createdBy, itemId, newItemId, updatedAt }: DuplicateItineraryItemInput,
): ItineraryMutationResult {
  const item = current.itinerary.items[itemId];

  if (!item) {
    return mutationError("item-not-found", "복제할 일정 아이템을 찾을 수 없습니다.");
  }

  const day = current.itinerary.days[item.dayId];

  if (!day) {
    return mutationError("day-not-found", "복제할 일정의 날짜를 찾을 수 없습니다.");
  }

  const sourceIndex = day.itemIds.indexOf(itemId);

  if (sourceIndex < 0) {
    return mutationError("item-not-in-day", "복제할 일정이 지정된 날짜에 없습니다.");
  }

  return addItineraryItem(current, {
    item: {
      ...item,
      createdBy,
      id: newItemId,
      place: { ...item.place },
      updatedAt,
    },
    position: sourceIndex + 1,
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

function getStartTimeSortValue(item: ItineraryItem | undefined) {
  if (!item?.startTime) {
    return Number.POSITIVE_INFINITY;
  }

  const [hours, minutes] = item.startTime.split(":").map(Number);

  return hours * 60 + minutes;
}

export function sortItineraryItemsByStartTime(
  current: TripItinerary,
  { dayId }: SortItineraryItemsByStartTimeInput,
): ItineraryMutationResult {
  const day = current.itinerary.days[dayId];

  if (!day) {
    return mutationError("day-not-found", "시간순으로 정렬할 날짜를 찾을 수 없습니다.");
  }

  const itemIds = day.itemIds
    .map((itemId, index) => ({
      index,
      itemId,
      startTimeValue: getStartTimeSortValue(current.itinerary.items[itemId]),
    }))
    .toSorted((left, right) => left.startTimeValue - right.startTimeValue || left.index - right.index)
    .map(({ itemId }) => itemId);

  if (itemIds.every((itemId, index) => itemId === day.itemIds[index])) {
    return { success: true, data: current };
  }

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

export function resizeTripItinerary(
  current: TripItinerary,
  { endDate, startDate }: ResizeTripItineraryInput,
): ItineraryMutationResult {
  const nextTrip = {
    ...current.trip,
    endDate,
    startDate,
  };
  const nextTripValidation = tripItinerarySchema.shape.trip.safeParse(nextTrip);

  if (!nextTripValidation.success) {
    return mutationError(
      "invalid-document",
      nextTripValidation.error.issues[0]?.message ?? "여행 기간을 확인해 주세요.",
    );
  }

  if (current.trip.startDate === startDate && current.trip.endDate === endDate) {
    return { success: true, data: current };
  }

  const removedDays = Object.values(current.itinerary.days).filter(
    (day) => day.date < startDate || day.date > endDate,
  );
  const scheduledDay = removedDays.find((day) => day.itemIds.length > 0);

  if (scheduledDay) {
    return mutationError(
      "scheduled-day-outside-range",
      `${scheduledDay.date}에 일정이 있어 여행 기간을 줄일 수 없습니다. 일정을 다른 날짜로 옮기거나 삭제한 뒤 다시 시도해 주세요.`,
    );
  }

  const dayWithPlaceSuggestion = removedDays.find((day) =>
    Object.values(current.itinerary.placeSuggestions).some(
      (suggestion) => suggestion.dayId === day.id,
    ),
  );

  if (dayWithPlaceSuggestion) {
    return mutationError(
      "scheduled-day-outside-range",
      `${dayWithPlaceSuggestion.date}에 후보 장소가 있어 여행 기간을 줄일 수 없습니다. 후보 장소를 일정에 추가하거나 삭제한 뒤 다시 시도해 주세요.`,
    );
  }

  const nextDaysByDate = new Map<string, TripDay>();

  for (const day of Object.values(current.itinerary.days)) {
    if (day.date >= startDate && day.date <= endDate) {
      nextDaysByDate.set(day.date, day);
    }
  }
  const usedDayIds = new Set(Object.keys(current.itinerary.days));
  const nextDays: TripItinerary["itinerary"]["days"] = {};
  const dayOrder: string[] = [];

  getCalendarDatesInRange(startDate, endDate).forEach((date) => {
    const existingDay = nextDaysByDate.get(date);

    if (existingDay) {
      nextDays[existingDay.id] = existingDay;
      dayOrder.push(existingDay.id);
      return;
    }

    const dayId = createAddedDayId(current.trip.id, date, usedDayIds);

    nextDays[dayId] = {
      date,
      id: dayId,
      itemIds: [],
      tripId: current.trip.id,
    };
    dayOrder.push(dayId);
  });

  return validateMutation({
    trip: nextTripValidation.data,
    itinerary: {
      ...current.itinerary,
      dayOrder,
      days: nextDays,
    },
  });
}
