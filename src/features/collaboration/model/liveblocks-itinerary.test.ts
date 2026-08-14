import { LiveObject } from "@liveblocks/client";
import { describe, expect, it } from "vitest";

import {
  duplicateItineraryItem,
  moveItineraryItem,
  updateItineraryItem,
} from "@/entities/itinerary/model/mutations";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  applyItineraryMutationToStorage,
  createTripItineraryStorage,
  getLiveblocksItinerarySnapshot,
  getLiveblocksTripDateRange,
} from "@/features/collaboration/model/liveblocks-itinerary";

function createStorageRoot() {
  return new LiveObject(createTripItineraryStorage(jejuTrip.itinerary));
}

describe("Liveblocks itinerary storage", () => {
  it("round-trips the validated itinerary document through Liveblocks structures", () => {
    const storage = createStorageRoot();

    expect(getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON())).toEqual(jejuTrip);
  });

  it("commits a cross-day move while preserving the domain invariants", () => {
    const storage = createStorageRoot();

    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      moveItineraryItem(current, {
        destinationDayId: "jeju-day-2",
        itemId: "woojin-breakfast",
        sourceDayId: "jeju-day-1",
        toIndex: 0,
      }),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.days["jeju-day-1"]?.itemIds).not.toContain("woojin-breakfast");
    expect(snapshot?.itinerary.days["jeju-day-2"]?.itemIds).toEqual(["woojin-breakfast"]);
    expect(snapshot?.itinerary.items["woojin-breakfast"]?.dayId).toBe("jeju-day-2");
  });

  it("updates only the edited item fields without resetting a different item", () => {
    const storage = createStorageRoot();

    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      updateItineraryItem(current, {
        itemId: "hamdeok-beach",
        changes: {
          note: "일몰 전에 도착",
          updatedAt: "2026-01-16T09:00:00.000Z",
        },
      }),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.items["hamdeok-beach"]?.note).toBe("일몰 전에 도착");
    expect(snapshot?.itinerary.items["bijarim-forest"]).toEqual(
      jejuTrip.itinerary.items["bijarim-forest"],
    );
  });

  it("persists a duplicated item immediately after its source", () => {
    const storage = createStorageRoot();

    const result = applyItineraryMutationToStorage(storage, jejuTrip.trip, (current) =>
      duplicateItineraryItem(current, {
        createdBy: "user-minji",
        itemId: "woojin-breakfast",
        newItemId: "woojin-breakfast-copy",
        updatedAt: "2026-01-20T10:00:00.000Z",
      }),
    );
    const snapshot = getLiveblocksItinerarySnapshot(jejuTrip.trip, storage.toJSON());

    expect(result.success).toBe(true);
    expect(snapshot?.itinerary.days["jeju-day-1"]?.itemIds).toEqual([
      "woojin-breakfast",
      "woojin-breakfast-copy",
      "hamdeok-beach",
      "bijarim-forest",
    ]);
    expect(snapshot?.itinerary.items["woojin-breakfast-copy"]).toMatchObject({
      createdBy: "user-minji",
      id: "woojin-breakfast-copy",
    });
  });

  it("derives the active trip date range from shared itinerary days", () => {
    const storage = createStorageRoot();

    expect(getLiveblocksTripDateRange(storage.toJSON())).toEqual({
      endDate: "2026-04-21",
      startDate: "2026-04-18",
    });
  });
});
