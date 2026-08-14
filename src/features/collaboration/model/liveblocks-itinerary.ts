import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

import type { ItineraryMutationResult } from "@/entities/itinerary/model/mutations";
import {
  itineraryDocumentSchema,
  tripItinerarySchema,
} from "@/entities/itinerary/model/trip-itinerary";
import type {
  ItineraryDocument,
  ItineraryItem,
  TripDay,
  TripItinerary,
} from "@/entities/itinerary/model/trip-itinerary";
import type { Trip } from "@/entities/trip/model/trip";

type ItineraryMutation = (current: TripItinerary) => ItineraryMutationResult;

export type LiveTripDay = Omit<TripDay, "itemIds"> & {
  itemIds: LiveList<string>;
};

export type TripItineraryStorage = {
  dayOrder: LiveList<string>;
  days: LiveMap<string, LiveObject<LiveTripDay>>;
  items: LiveMap<string, LiveObject<ItineraryItem>>;
};

function createLiveTripDay(day: TripDay) {
  return new LiveObject<LiveTripDay>({
    date: day.date,
    id: day.id,
    itemIds: new LiveList(day.itemIds),
    tripId: day.tripId,
  });
}

export function createTripItineraryStorage(
  itinerary: ItineraryDocument,
): TripItineraryStorage {
  return {
    dayOrder: new LiveList(itinerary.dayOrder),
    days: new LiveMap(
      Object.values(itinerary.days).map((day) => [day.id, createLiveTripDay(day)]),
    ),
    items: new LiveMap(
      Object.values(itinerary.items).map((item) => [item.id, new LiveObject(item)]),
    ),
  };
}

function invalidDocumentResult(): ItineraryMutationResult {
  return {
    code: "invalid-document",
    message: "공유 일정 데이터를 불러올 수 없습니다.",
    success: false,
  };
}

export function readTripItineraryFromStorage(
  trip: Trip,
  storage: unknown,
): ItineraryMutationResult {
  const result = tripItinerarySchema.safeParse({
    itinerary: storage,
    trip,
  });

  if (!result.success) {
    return invalidDocumentResult();
  }

  return { data: result.data, success: true };
}

function synchronizeLiveList(liveList: LiveList<string>, nextItems: readonly string[]) {
  const currentItems = liveList.map((item) => item);

  nextItems.forEach((item, targetIndex) => {
    const currentIndex = currentItems.indexOf(item);

    if (currentIndex === targetIndex) {
      return;
    }

    if (currentIndex === -1) {
      liveList.insert(item, targetIndex);
      currentItems.splice(targetIndex, 0, item);
      return;
    }

    liveList.move(currentIndex, targetIndex);
    const [movedItem] = currentItems.splice(currentIndex, 1);

    if (movedItem) {
      currentItems.splice(targetIndex, 0, movedItem);
    }
  });

  while (currentItems.length > nextItems.length) {
    const lastIndex = currentItems.length - 1;
    liveList.delete(lastIndex);
    currentItems.pop();
  }
}

function getDayPatch(currentDay: TripDay, nextDay: TripDay): Partial<LiveTripDay> {
  const patch: Partial<LiveTripDay> = {};

  if (currentDay.date !== nextDay.date) {
    patch.date = nextDay.date;
  }

  if (currentDay.tripId !== nextDay.tripId) {
    patch.tripId = nextDay.tripId;
  }

  return patch;
}

function getItemPatch(
  currentItem: ItineraryItem,
  nextItem: ItineraryItem,
): Partial<ItineraryItem> {
  const patch: Partial<ItineraryItem> = {};

  if (currentItem.dayId !== nextItem.dayId) {
    patch.dayId = nextItem.dayId;
  }

  if (currentItem.startTime !== nextItem.startTime) {
    patch.startTime = nextItem.startTime;
  }

  if (currentItem.durationMinutes !== nextItem.durationMinutes) {
    patch.durationMinutes = nextItem.durationMinutes;
  }

  if (currentItem.note !== nextItem.note) {
    patch.note = nextItem.note;
  }

  if (currentItem.updatedAt !== nextItem.updatedAt) {
    patch.updatedAt = nextItem.updatedAt;
  }

  if (JSON.stringify(currentItem.place) !== JSON.stringify(nextItem.place)) {
    patch.place = nextItem.place;
  }

  return patch;
}

function synchronizeDays(
  liveDays: LiveMap<string, LiveObject<LiveTripDay>>,
  currentDays: ItineraryDocument["days"],
  nextDays: ItineraryDocument["days"],
) {
  for (const dayId of liveDays.keys()) {
    if (!nextDays[dayId]) {
      liveDays.delete(dayId);
    }
  }

  Object.values(nextDays).forEach((nextDay) => {
    const liveDay = liveDays.get(nextDay.id);

    if (!liveDay) {
      liveDays.set(nextDay.id, createLiveTripDay(nextDay));
      return;
    }

    const currentDay = currentDays[nextDay.id];

    if (currentDay) {
      const patch = getDayPatch(currentDay, nextDay);

      if (Object.keys(patch).length > 0) {
        liveDay.update(patch);
      }
    }

    synchronizeLiveList(liveDay.get("itemIds"), nextDay.itemIds);
  });
}

function synchronizeItems(
  liveItems: LiveMap<string, LiveObject<ItineraryItem>>,
  currentItems: ItineraryDocument["items"],
  nextItems: ItineraryDocument["items"],
) {
  for (const itemId of liveItems.keys()) {
    if (!nextItems[itemId]) {
      liveItems.delete(itemId);
    }
  }

  Object.values(nextItems).forEach((nextItem) => {
    const liveItem = liveItems.get(nextItem.id);

    if (!liveItem) {
      liveItems.set(nextItem.id, new LiveObject(nextItem));
      return;
    }

    const currentItem = currentItems[nextItem.id];

    if (!currentItem) {
      liveItem.update(nextItem);
      return;
    }

    const patch = getItemPatch(currentItem, nextItem);

    if (Object.keys(patch).length > 0) {
      liveItem.update(patch);
    }
  });
}

function synchronizeItineraryStorage(
  storage: LiveObject<TripItineraryStorage>,
  current: ItineraryDocument,
  next: ItineraryDocument,
) {
  synchronizeLiveList(storage.get("dayOrder"), next.dayOrder);
  synchronizeDays(storage.get("days"), current.days, next.days);
  synchronizeItems(storage.get("items"), current.items, next.items);
}

export function applyItineraryMutationToStorage(
  storage: LiveObject<TripItineraryStorage>,
  trip: Trip,
  mutation: ItineraryMutation,
): ItineraryMutationResult {
  const current = readTripItineraryFromStorage(trip, storage.toJSON());

  if (!current.success) {
    return current;
  }

  const result = mutation(current.data);

  if (!result.success) {
    return result;
  }

  synchronizeItineraryStorage(storage, current.data.itinerary, result.data.itinerary);
  return result;
}

export function getLiveblocksItinerarySnapshot(
  trip: Trip,
  storage: unknown,
): TripItinerary | null {
  const result = readTripItineraryFromStorage(trip, storage);

  return result.success ? result.data : null;
}

export function getLiveblocksTripDateRange(storage: unknown) {
  const result = itineraryDocumentSchema.safeParse(storage);

  if (!result.success) {
    return null;
  }

  const dates = Object.values(result.data.days).map((day) => day.date).toSorted();
  const startDate = dates[0];
  const endDate = dates.at(-1);

  if (!startDate || !endDate) {
    return null;
  }

  return { endDate, startDate };
}
