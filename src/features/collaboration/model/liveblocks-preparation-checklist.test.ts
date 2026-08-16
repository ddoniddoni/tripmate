import { LiveObject } from "@liveblocks/client";
import { describe, expect, it } from "vitest";

import {
  addPreparationChecklistItem,
  setPreparationChecklistItemCompletion,
  updatePreparationChecklistItem,
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
  dueDate: null,
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
    const updated = applyPreparationChecklistMutationToStorage(storage, (current) =>
      updatePreparationChecklistItem(current, {
        changes: {
          category: "other",
          dueDate: "2026-04-10",
          title: "여행용 상비약 챙기기",
        },
        itemId: "sun-cream",
      }),
    );

    expect(result.success).toBe(true);
    expect(completed.success).toBe(true);
    expect(updated.success).toBe(true);
    expect(getLiveblocksPreparationChecklistSnapshot(storage.toJSON())).toEqual({
      items: {
        "sun-cream": {
          ...checklistItem,
          category: "other",
          completedAt: "2026-04-02T10:00:00.000Z",
          dueDate: "2026-04-10",
          title: "여행용 상비약 챙기기",
        },
      },
    });
    expect(storage.toJSON().items).toEqual(jejuTrip.itinerary.items);
  });

  it("reads existing checklist items without a due date as items with no deadline", () => {
    expect(
      getLiveblocksPreparationChecklistSnapshot({
        checklistItems: {
          passport: {
            assigneeId: null,
            category: "packing",
            completedAt: null,
            createdAt: "2026-04-01T09:00:00.000Z",
            createdBy: "user-jiwoo",
            id: "passport",
            title: "여권 유효기간 확인하기",
          },
        },
      }),
    ).toEqual({
      items: {
        passport: {
          assigneeId: null,
          category: "packing",
          completedAt: null,
          createdAt: "2026-04-01T09:00:00.000Z",
          createdBy: "user-jiwoo",
          dueDate: null,
          id: "passport",
          title: "여권 유효기간 확인하기",
        },
      },
    });
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
