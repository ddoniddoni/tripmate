import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  addItineraryItem,
  moveItineraryItem,
  removeItineraryItem,
  reorderItineraryItem,
  updateItineraryItem,
} from "@/entities/itinerary/model/mutations";
import type { ItineraryItem } from "@/entities/itinerary/model/trip-itinerary";
import { validateTripItinerary } from "@/entities/itinerary/model/trip-itinerary";

const newItem: ItineraryItem = {
  id: "seongsan-sunrise",
  dayId: "jeju-day-2",
  place: {
    provider: "mapbox",
    providerPlaceId: "mock.mapbox.seongsan",
    name: "성산일출봉",
    address: "성산읍 일출로 284-12",
    longitude: 126.9425,
    latitude: 33.4581,
    category: "자연",
  },
  startTime: "08:00",
  durationMinutes: 120,
  note: "아침 일찍 출발",
  createdBy: "user-jiwoo",
  updatedAt: "2026-01-16T09:00:00.000Z",
};

function expectSuccess(result: ReturnType<typeof addItineraryItem>) {
  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error(result.message);
  }

  expect(validateTripItinerary(result.data).success).toBe(true);
  return result.data;
}

describe("itinerary mutations", () => {
  it("adds an item to the end of a day without mutating the current document", () => {
    const before = structuredClone(jejuTrip);
    const result = addItineraryItem(jejuTrip, { item: newItem });
    const next = expectSuccess(result);

    expect(next.itinerary.days["jeju-day-2"].itemIds).toEqual([newItem.id]);
    expect(next.itinerary.items[newItem.id]).toEqual(newItem);
    expect(jejuTrip).toEqual(before);
  });

  it("inserts an item at a requested position", () => {
    const item = { ...newItem, dayId: "jeju-day-1" };
    const result = addItineraryItem(jejuTrip, { item, position: 1 });
    const next = expectSuccess(result);

    expect(next.itinerary.days["jeju-day-1"].itemIds).toEqual([
      "woojin-breakfast",
      newItem.id,
      "hamdeok-beach",
      "bijarim-forest",
    ]);
  });

  it("rejects an unknown day, duplicate ID, and invalid insertion position", () => {
    const missingDay = addItineraryItem(jejuTrip, {
      item: { ...newItem, dayId: "missing-day" },
    });
    const duplicate = addItineraryItem(jejuTrip, {
      item: { ...newItem, id: "woojin-breakfast" },
    });
    const invalidPosition = addItineraryItem(jejuTrip, { item: newItem, position: 2 });

    expect(missingDay).toMatchObject({ success: false, code: "day-not-found" });
    expect(duplicate).toMatchObject({ success: false, code: "item-already-exists" });
    expect(invalidPosition).toMatchObject({ success: false, code: "invalid-position" });
  });

  it("updates editable item fields and preserves identity fields", () => {
    const result = updateItineraryItem(jejuTrip, {
      itemId: "woojin-breakfast",
      changes: {
        note: "수정한 메모",
        durationMinutes: 60,
        updatedAt: "2026-01-20T10:00:00.000Z",
      },
    });
    const next = expectSuccess(result);
    const item = next.itinerary.items["woojin-breakfast"];

    expect(item.id).toBe("woojin-breakfast");
    expect(item.dayId).toBe("jeju-day-1");
    expect(item.note).toBe("수정한 메모");
    expect(item.durationMinutes).toBe(60);
  });

  it("rejects an update that would violate the item schema", () => {
    const result = updateItineraryItem(jejuTrip, {
      itemId: "woojin-breakfast",
      changes: {
        durationMinutes: 0,
        updatedAt: "2026-01-20T10:00:00.000Z",
      },
    });

    expect(result).toMatchObject({ success: false, code: "invalid-document" });
  });

  it("removes an item from both the ordered day and item record", () => {
    const result = removeItineraryItem(jejuTrip, "hamdeok-beach");
    const next = expectSuccess(result);

    expect(next.itinerary.days["jeju-day-1"].itemIds).toEqual([
      "woojin-breakfast",
      "bijarim-forest",
    ]);
    expect(next.itinerary.items["hamdeok-beach"]).toBeUndefined();
  });

  it("rejects removal of an unknown item", () => {
    expect(removeItineraryItem(jejuTrip, "missing-item")).toMatchObject({
      success: false,
      code: "item-not-found",
    });
  });

  it("reorders an item forward and backward within one day", () => {
    const movedForward = expectSuccess(
      reorderItineraryItem(jejuTrip, {
        dayId: "jeju-day-1",
        itemId: "woojin-breakfast",
        toIndex: 2,
      }),
    );
    const movedBackward = expectSuccess(
      reorderItineraryItem(movedForward, {
        dayId: "jeju-day-1",
        itemId: "woojin-breakfast",
        toIndex: 0,
      }),
    );

    expect(movedForward.itinerary.days["jeju-day-1"].itemIds).toEqual([
      "hamdeok-beach",
      "bijarim-forest",
      "woojin-breakfast",
    ]);
    expect(movedBackward.itinerary.days["jeju-day-1"].itemIds).toEqual(
      jejuTrip.itinerary.days["jeju-day-1"].itemIds,
    );
  });

  it("returns the same document when an item stays in place", () => {
    const result = reorderItineraryItem(jejuTrip, {
      dayId: "jeju-day-1",
      itemId: "hamdeok-beach",
      toIndex: 1,
    });

    expect(result).toEqual({ success: true, data: jejuTrip });
  });

  it("moves an item to the beginning, middle, and end of another day", () => {
    const first = expectSuccess(
      moveItineraryItem(jejuTrip, {
        itemId: "woojin-breakfast",
        sourceDayId: "jeju-day-1",
        destinationDayId: "jeju-day-3",
        toIndex: 0,
      }),
    );
    const withSecondItem = expectSuccess(
      addItineraryItem(first, { item: { ...newItem, dayId: "jeju-day-3" } }),
    );
    const middle = expectSuccess(
      moveItineraryItem(withSecondItem, {
        itemId: "hamdeok-beach",
        sourceDayId: "jeju-day-1",
        destinationDayId: "jeju-day-3",
        toIndex: 1,
      }),
    );
    const end = expectSuccess(
      moveItineraryItem(middle, {
        itemId: "bijarim-forest",
        sourceDayId: "jeju-day-1",
        destinationDayId: "jeju-day-3",
        toIndex: 3,
      }),
    );

    expect(first.itinerary.days["jeju-day-1"].itemIds).toEqual([
      "hamdeok-beach",
      "bijarim-forest",
    ]);
    expect(first.itinerary.items["woojin-breakfast"].dayId).toBe("jeju-day-3");
    expect(middle.itinerary.days["jeju-day-3"].itemIds).toEqual([
      "woojin-breakfast",
      "hamdeok-beach",
      "seongsan-sunrise",
    ]);
    expect(end.itinerary.days["jeju-day-3"].itemIds).toEqual([
      "woojin-breakfast",
      "hamdeok-beach",
      "seongsan-sunrise",
      "bijarim-forest",
    ]);
    expect(end.itinerary.days["jeju-day-1"].itemIds).toEqual([]);
    expect(end.itinerary.items["bijarim-forest"].dayId).toBe("jeju-day-3");
  });

  it("moves an item to an empty day without mutating the current document", () => {
    const before = structuredClone(jejuTrip);
    const result = moveItineraryItem(jejuTrip, {
      itemId: "woojin-breakfast",
      sourceDayId: "jeju-day-1",
      destinationDayId: "jeju-day-2",
      toIndex: 0,
    });
    const next = expectSuccess(result);

    expect(next.itinerary.days["jeju-day-2"].itemIds).toEqual(["woojin-breakfast"]);
    expect(next.itinerary.items["woojin-breakfast"].dayId).toBe("jeju-day-2");
    expect(jejuTrip).toEqual(before);
  });

  it("uses same-day reorder semantics when the destination is unchanged", () => {
    const result = moveItineraryItem(jejuTrip, {
      itemId: "woojin-breakfast",
      sourceDayId: "jeju-day-1",
      destinationDayId: "jeju-day-1",
      toIndex: 2,
    });
    const next = expectSuccess(result);

    expect(next.itinerary.days["jeju-day-1"].itemIds).toEqual([
      "hamdeok-beach",
      "bijarim-forest",
      "woojin-breakfast",
    ]);
  });

  it("rejects an unknown day, absent item, and out-of-range destination", () => {
    expect(
      reorderItineraryItem(jejuTrip, {
        dayId: "missing-day",
        itemId: "woojin-breakfast",
        toIndex: 0,
      }),
    ).toMatchObject({ success: false, code: "day-not-found" });
    expect(
      reorderItineraryItem(jejuTrip, {
        dayId: "jeju-day-2",
        itemId: "woojin-breakfast",
        toIndex: 0,
      }),
    ).toMatchObject({ success: false, code: "item-not-in-day" });
    expect(
      reorderItineraryItem(jejuTrip, {
        dayId: "jeju-day-1",
        itemId: "woojin-breakfast",
        toIndex: 3,
      }),
    ).toMatchObject({ success: false, code: "invalid-position" });
  });

  it("rejects stale source days, missing items, and invalid cross-day destinations", () => {
    expect(
      moveItineraryItem(jejuTrip, {
        itemId: "woojin-breakfast",
        sourceDayId: "jeju-day-2",
        destinationDayId: "jeju-day-3",
        toIndex: 0,
      }),
    ).toMatchObject({ success: false, code: "item-not-in-day" });
    expect(
      moveItineraryItem(jejuTrip, {
        itemId: "missing-item",
        sourceDayId: "jeju-day-1",
        destinationDayId: "jeju-day-2",
        toIndex: 0,
      }),
    ).toMatchObject({ success: false, code: "item-not-found" });
    expect(
      moveItineraryItem(jejuTrip, {
        itemId: "woojin-breakfast",
        sourceDayId: "jeju-day-1",
        destinationDayId: "missing-day",
        toIndex: 0,
      }),
    ).toMatchObject({ success: false, code: "day-not-found" });
    expect(
      moveItineraryItem(jejuTrip, {
        itemId: "woojin-breakfast",
        sourceDayId: "jeju-day-1",
        destinationDayId: "jeju-day-2",
        toIndex: 1,
      }),
    ).toMatchObject({ success: false, code: "invalid-position" });
  });
});
