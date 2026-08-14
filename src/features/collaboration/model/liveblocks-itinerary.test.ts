import { LiveObject } from "@liveblocks/client";
import { describe, expect, it } from "vitest";

import { moveItineraryItem, updateItineraryItem } from "@/entities/itinerary/model/mutations";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  applyItineraryMutationToStorage,
  createTripItineraryStorage,
  getLiveblocksItinerarySnapshot,
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
});
