import { LiveObject } from "@liveblocks/client";
import { describe, expect, it } from "vitest";

import {
  addPreparationChecklistItem,
  setPreparationChecklistItemCompletion,
} from "@/entities/preparation-checklist/model/preparation-checklist";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  applyPreparationChecklistMutationToStorage,
  getLiveblocksPreparationChecklistSnapshot,
} from "@/features/collaboration/model/liveblocks-preparation-checklist";
import { createTripItineraryStorage } from "@/features/collaboration/model/liveblocks-itinerary";

function createStorageRoot() {
  return new LiveObject(createTripItineraryStorage(jejuTrip.itinerary));
}

const checklistItem = {
  assigneeId: "user-jiwoo",
  category: "packing" as const,
  completedAt: null,
  createdAt: "2026-04-01T09:00:00.000Z",
  createdBy: "user-jiwoo",
  id: "sun-cream",
  title: "자외선 차단제 챙기기",
};

describe("Liveblocks preparation checklist storage", () => {
  it("creates and updates checklist items without changing the itinerary", () => {
    const storage = createStorageRoot();
    const result = applyPreparationChecklistMutationToStorage(storage, (current) =>
      addPreparationChecklistItem(current, checklistItem),
    );
    const completed = applyPreparationChecklistMutationToStorage(storage, (current) =>
      setPreparationChecklistItemCompletion(current, "sun-cream", "2026-04-02T10:00:00.000Z"),
    );

    expect(result.success).toBe(true);
    expect(completed.success).toBe(true);
    expect(getLiveblocksPreparationChecklistSnapshot(storage.toJSON())).toEqual({
      items: {
        "sun-cream": {
          ...checklistItem,
          completedAt: "2026-04-02T10:00:00.000Z",
        },
      },
    });
    expect(storage.toJSON().items).toEqual(jejuTrip.itinerary.items);
  });

  it("initializes the checklist collection when an existing room does not have it yet", () => {
    const storage = createStorageRoot();
    storage.delete("checklistItems");

    expect(getLiveblocksPreparationChecklistSnapshot(storage.toJSON())).toEqual({ items: {} });

    const result = applyPreparationChecklistMutationToStorage(storage, (current) =>
      addPreparationChecklistItem(current, checklistItem),
    );

    expect(result.success).toBe(true);
    expect(
      getLiveblocksPreparationChecklistSnapshot(storage.toJSON())?.items["sun-cream"],
    ).toEqual(checklistItem);
  });
});
