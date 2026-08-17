import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  addPlaceSuggestion,
  addPlaceSuggestionComment,
  addItineraryItem,
  duplicateItineraryDayItems,
  duplicateItineraryItem,
  moveItineraryItem,
  promotePlaceSuggestion,
  removePlaceSuggestion,
  removeItineraryItem,
  reorderItineraryItem,
  resizeTripItinerary,
  sortItineraryItemsByStartTime,
  togglePlaceSuggestionVote,
  updateTripDayNote,
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

  it("saves a shared memo for one day without changing the itinerary items", () => {
    const next = expectSuccess(
      updateTripDayNote(jejuTrip, {
        dayId: "jeju-day-1",
        note: "우천 시 실내 코스로 바꾸기",
      }),
    );

    expect(next.itinerary.days["jeju-day-1"]?.note).toBe("우천 시 실내 코스로 바꾸기");
    expect(next.itinerary.items).toEqual(jejuTrip.itinerary.items);
  });

  it("keeps candidate places outside the itinerary until one is promoted", () => {
    const suggestion = {
      comments: {},
      createdAt: "2026-01-20T10:00:00.000Z",
      createdBy: "user-minji",
      dayId: "jeju-day-1",
      id: "seongsan-candidate",
      note: "해 뜨기 전에 가면 좋대요",
      place: newItem.place,
      votes: {},
    };
    const withSuggestion = expectSuccess(addPlaceSuggestion(jejuTrip, { suggestion }));

    expect(withSuggestion.itinerary.placeSuggestions[suggestion.id]).toEqual(suggestion);
    expect(withSuggestion.itinerary.days["jeju-day-1"]?.itemIds).not.toContain(suggestion.id);

    const promoted = expectSuccess(
      promotePlaceSuggestion(withSuggestion, {
        createdBy: "user-jiwoo",
        newItemId: "seongsan-scheduled",
        suggestionId: suggestion.id,
        updatedAt: "2026-01-20T11:00:00.000Z",
      }),
    );

    expect(promoted.itinerary.placeSuggestions[suggestion.id]).toBeUndefined();
    expect(promoted.itinerary.days["jeju-day-1"]?.itemIds).toContain("seongsan-scheduled");
    expect(promoted.itinerary.items["seongsan-scheduled"]).toMatchObject({
      dayId: "jeju-day-1",
      note: suggestion.note,
      place: suggestion.place,
    });
  });

  it("rejects candidate places for unknown days and lets editors remove a candidate", () => {
    const suggestion = {
      comments: {},
      createdAt: "2026-01-20T10:00:00.000Z",
      createdBy: "user-minji",
      dayId: "missing-day",
      id: "missing-day-candidate",
      place: newItem.place,
      votes: {},
    };

    expect(addPlaceSuggestion(jejuTrip, { suggestion })).toMatchObject({
      code: "day-not-found",
      success: false,
    });

    const withSuggestion = expectSuccess(
      addPlaceSuggestion(jejuTrip, {
        suggestion: { ...suggestion, dayId: "jeju-day-2", id: "day-two-candidate" },
      }),
    );
    const removed = expectSuccess(removePlaceSuggestion(withSuggestion, "day-two-candidate"));

    expect(removed.itinerary.placeSuggestions).toEqual({});
  });

  it("toggles one vote per member and keeps candidate comments in the shared document", () => {
    const withSuggestion = expectSuccess(
      addPlaceSuggestion(jejuTrip, {
        suggestion: {
          comments: {},
          createdAt: "2026-01-20T10:00:00.000Z",
          createdBy: "user-minji",
          dayId: "jeju-day-1",
          id: "vote-candidate",
          place: newItem.place,
          votes: {},
        },
      }),
    );
    const voted = expectSuccess(
      togglePlaceSuggestionVote(withSuggestion, {
        suggestionId: "vote-candidate",
        userId: "user-jiwoo",
        votedAt: "2026-01-20T10:10:00.000Z",
      }),
    );

    expect(voted.itinerary.placeSuggestions["vote-candidate"]?.votes).toEqual({
      "user-jiwoo": "2026-01-20T10:10:00.000Z",
    });

    const commented = expectSuccess(
      addPlaceSuggestionComment(voted, {
        comment: {
          body: "오전에 가면 덜 붐빈대요.",
          createdAt: "2026-01-20T10:12:00.000Z",
          createdBy: "user-jiwoo",
          id: "vote-candidate-comment-1",
        },
        suggestionId: "vote-candidate",
      }),
    );

    expect(commented.itinerary.placeSuggestions["vote-candidate"]?.comments).toMatchObject({
      "vote-candidate-comment-1": {
        body: "오전에 가면 덜 붐빈대요.",
        createdBy: "user-jiwoo",
      },
    });

    const unvoted = expectSuccess(
      togglePlaceSuggestionVote(commented, {
        suggestionId: "vote-candidate",
        userId: "user-jiwoo",
        votedAt: "2026-01-20T10:15:00.000Z",
      }),
    );

    expect(unvoted.itinerary.placeSuggestions["vote-candidate"]?.votes).toEqual({});
    expect(unvoted.itinerary.placeSuggestions["vote-candidate"]?.comments).toEqual(
      commented.itinerary.placeSuggestions["vote-candidate"]?.comments,
    );
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

  it("duplicates an item directly after its source with a new identity", () => {
    const before = structuredClone(jejuTrip);
    const result = duplicateItineraryItem(jejuTrip, {
      createdBy: "user-minji",
      itemId: "woojin-breakfast",
      newItemId: "woojin-breakfast-copy",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });
    const next = expectSuccess(result);

    expect(next.itinerary.days["jeju-day-1"].itemIds).toEqual([
      "woojin-breakfast",
      "woojin-breakfast-copy",
      "hamdeok-beach",
      "bijarim-forest",
    ]);
    expect(next.itinerary.items["woojin-breakfast-copy"]).toMatchObject({
      ...jejuTrip.itinerary.items["woojin-breakfast"],
      createdBy: "user-minji",
      id: "woojin-breakfast-copy",
      updatedAt: "2026-01-20T10:00:00.000Z",
    });
    expect(next.itinerary.items["woojin-breakfast-copy"]?.place).not.toBe(
      next.itinerary.items["woojin-breakfast"]?.place,
    );
    expect(jejuTrip).toEqual(before);
  });

  it("rejects duplication of a missing item or duplicate item ID", () => {
    expect(
      duplicateItineraryItem(jejuTrip, {
        createdBy: "user-minji",
        itemId: "missing-item",
        newItemId: "missing-item-copy",
        updatedAt: "2026-01-20T10:00:00.000Z",
      }),
    ).toMatchObject({ success: false, code: "item-not-found" });
    expect(
      duplicateItineraryItem(jejuTrip, {
        createdBy: "user-minji",
        itemId: "woojin-breakfast",
        newItemId: "woojin-breakfast",
        updatedAt: "2026-01-20T10:00:00.000Z",
      }),
    ).toMatchObject({ success: false, code: "item-already-exists" });
  });

  it("copies one complete day to the end of another day as one immutable mutation", () => {
    const withDestinationItem = expectSuccess(addItineraryItem(jejuTrip, { item: newItem }));
    const before = structuredClone(withDestinationItem);
    const newItemIds = [
      "woojin-breakfast-day-copy",
      "hamdeok-beach-day-copy",
      "bijarim-forest-day-copy",
    ];
    const next = expectSuccess(
      duplicateItineraryDayItems(withDestinationItem, {
        createdBy: "user-minji",
        destinationDayId: "jeju-day-2",
        newItemIds,
        sourceDayId: "jeju-day-1",
        updatedAt: "2026-01-20T12:00:00.000Z",
      }),
    );

    expect(next.itinerary.days["jeju-day-1"].itemIds).toEqual(
      jejuTrip.itinerary.days["jeju-day-1"].itemIds,
    );
    expect(next.itinerary.days["jeju-day-2"].itemIds).toEqual([
      newItem.id,
      ...newItemIds,
    ]);
    expect(next.itinerary.days["jeju-day-2"].note).toBeUndefined();
    expect(next.itinerary.items[newItemIds[0]]).toMatchObject({
      ...jejuTrip.itinerary.items["woojin-breakfast"],
      createdBy: "user-minji",
      dayId: "jeju-day-2",
      id: newItemIds[0],
      updatedAt: "2026-01-20T12:00:00.000Z",
    });
    expect(next.itinerary.items[newItemIds[0]]?.place).not.toBe(
      next.itinerary.items["woojin-breakfast"]?.place,
    );
    expect(withDestinationItem).toEqual(before);
  });

  it("rejects invalid day-copy targets, empty sources, stale counts, and reused IDs", () => {
    expect(
      duplicateItineraryDayItems(jejuTrip, {
        createdBy: "user-minji",
        destinationDayId: "jeju-day-1",
        newItemIds: ["copy-1", "copy-2", "copy-3"],
        sourceDayId: "jeju-day-1",
        updatedAt: "2026-01-20T12:00:00.000Z",
      }),
    ).toMatchObject({ code: "same-day-copy", success: false });
    expect(
      duplicateItineraryDayItems(jejuTrip, {
        createdBy: "user-minji",
        destinationDayId: "jeju-day-1",
        newItemIds: [],
        sourceDayId: "jeju-day-2",
        updatedAt: "2026-01-20T12:00:00.000Z",
      }),
    ).toMatchObject({ code: "day-has-no-items", success: false });
    expect(
      duplicateItineraryDayItems(jejuTrip, {
        createdBy: "user-minji",
        destinationDayId: "jeju-day-2",
        newItemIds: ["copy-1"],
        sourceDayId: "jeju-day-1",
        updatedAt: "2026-01-20T12:00:00.000Z",
      }),
    ).toMatchObject({ code: "source-item-count-changed", success: false });
    expect(
      duplicateItineraryDayItems(jejuTrip, {
        createdBy: "user-minji",
        destinationDayId: "jeju-day-2",
        newItemIds: ["woojin-breakfast", "copy-2", "copy-3"],
        sourceDayId: "jeju-day-1",
        updatedAt: "2026-01-20T12:00:00.000Z",
      }),
    ).toMatchObject({ code: "item-already-exists", success: false });
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

  it("sorts scheduled items by their start time and keeps unscheduled items in their relative order", () => {
    const unscheduledItem: ItineraryItem = {
      ...newItem,
      dayId: "jeju-day-1",
      id: "unscheduled-stop",
      startTime: undefined,
    };
    const unordered = addItineraryItem(
      structuredClone(jejuTrip),
      { item: unscheduledItem, position: 0 },
    );
    const itineraryWithUnscheduledItem = expectSuccess(unordered);
    itineraryWithUnscheduledItem.itinerary.days["jeju-day-1"].itemIds = [
      "bijarim-forest",
      "unscheduled-stop",
      "hamdeok-beach",
      "woojin-breakfast",
    ];

    const result = sortItineraryItemsByStartTime(itineraryWithUnscheduledItem, {
      dayId: "jeju-day-1",
    });
    const next = expectSuccess(result);

    expect(next.itinerary.days["jeju-day-1"].itemIds).toEqual([
      "woojin-breakfast",
      "hamdeok-beach",
      "bijarim-forest",
      "unscheduled-stop",
    ]);
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

  it("adds empty days at both ends of an expanded trip without changing existing schedules", () => {
    const before = structuredClone(jejuTrip);
    const result = resizeTripItinerary(jejuTrip, {
      endDate: "2026-04-23",
      startDate: "2026-04-17",
    });
    const next = expectSuccess(result);

    expect(next.trip).toMatchObject({
      endDate: "2026-04-23",
      startDate: "2026-04-17",
    });
    expect(next.itinerary.dayOrder.map((dayId) => next.itinerary.days[dayId]?.date)).toEqual([
      "2026-04-17",
      "2026-04-18",
      "2026-04-19",
      "2026-04-20",
      "2026-04-21",
      "2026-04-22",
      "2026-04-23",
    ]);
    expect(next.itinerary.days["jeju-day-1"]?.itemIds).toEqual(
      jejuTrip.itinerary.days["jeju-day-1"]?.itemIds,
    );
    expect(next.itinerary.days["jeju-spring-day-20260417"]?.itemIds).toEqual([]);
    expect(next.itinerary.days["jeju-spring-day-20260423"]?.itemIds).toEqual([]);
    expect(jejuTrip).toEqual(before);
  });

  it("removes only empty dates that leave the reduced trip range", () => {
    const result = resizeTripItinerary(jejuTrip, {
      endDate: "2026-04-19",
      startDate: "2026-04-18",
    });
    const next = expectSuccess(result);

    expect(next.itinerary.dayOrder).toEqual(["jeju-day-1", "jeju-day-2"]);
    expect(next.itinerary.days["jeju-day-3"]).toBeUndefined();
    expect(next.itinerary.days["jeju-day-4"]).toBeUndefined();
    expect(next.itinerary.items).toEqual(jejuTrip.itinerary.items);
  });

  it("refuses to remove a date that contains itinerary items", () => {
    const result = resizeTripItinerary(jejuTrip, {
      endDate: "2026-04-21",
      startDate: "2026-04-19",
    });

    expect(result).toMatchObject({
      code: "scheduled-day-outside-range",
      success: false,
    });
  });
});
