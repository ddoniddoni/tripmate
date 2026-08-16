import { LiveMap, LiveObject } from "@liveblocks/client";

import {
  createEmptyPreparationChecklist,
  preparationChecklistDocumentSchema,
  type PreparationChecklistDocument,
  type PreparationChecklistItem,
  type PreparationChecklistMutationResult,
} from "@/entities/preparation-checklist/model/preparation-checklist";
import type { TripItineraryStorage } from "@/features/collaboration/model/liveblocks-itinerary";

export type PreparationChecklistMutation = (
  current: PreparationChecklistDocument,
) => PreparationChecklistMutationResult;

function invalidChecklistResult(): PreparationChecklistMutationResult {
  return {
    code: "invalid-item",
    message: "공유 준비 목록 데이터를 불러올 수 없습니다.",
    success: false,
  };
}

export function readPreparationChecklistFromStorage(
  storage: unknown,
): PreparationChecklistMutationResult {
  if (!storage || typeof storage !== "object") {
    return invalidChecklistResult();
  }

  const checklistItems = Object.getOwnPropertyDescriptor(storage, "checklistItems")?.value;

  if (checklistItems === undefined) {
    return { data: createEmptyPreparationChecklist(), success: true };
  }

  const result = preparationChecklistDocumentSchema.safeParse({ items: checklistItems });

  return result.success
    ? { data: result.data, success: true }
    : invalidChecklistResult();
}

export function getLiveblocksPreparationChecklistSnapshot(
  storage: unknown,
): PreparationChecklistDocument | null {
  const result = readPreparationChecklistFromStorage(storage);

  return result.success ? result.data : null;
}

function getItemPatch(
  currentItem: PreparationChecklistItem,
  nextItem: PreparationChecklistItem,
): Partial<PreparationChecklistItem> {
  const patch: Partial<PreparationChecklistItem> = {};

  if (currentItem.assigneeId !== nextItem.assigneeId) {
    patch.assigneeId = nextItem.assigneeId;
  }

  if (currentItem.category !== nextItem.category) {
    patch.category = nextItem.category;
  }

  if (currentItem.completedAt !== nextItem.completedAt) {
    patch.completedAt = nextItem.completedAt;
  }

  if (currentItem.createdAt !== nextItem.createdAt) {
    patch.createdAt = nextItem.createdAt;
  }

  if (currentItem.createdBy !== nextItem.createdBy) {
    patch.createdBy = nextItem.createdBy;
  }

  if (currentItem.dueDate !== nextItem.dueDate) {
    patch.dueDate = nextItem.dueDate;
  }

  if (currentItem.isPriority !== nextItem.isPriority) {
    patch.isPriority = nextItem.isPriority;
  }

  if (currentItem.title !== nextItem.title) {
    patch.title = nextItem.title;
  }

  return patch;
}

function getOrCreateChecklistItems(
  storage: LiveObject<TripItineraryStorage>,
): LiveMap<string, LiveObject<PreparationChecklistItem>> {
  const checklistItems = storage.get("checklistItems");

  if (checklistItems) {
    return checklistItems;
  }

  const nextChecklistItems = new LiveMap<string, LiveObject<PreparationChecklistItem>>();
  storage.set("checklistItems", nextChecklistItems);
  return nextChecklistItems;
}

function synchronizeChecklistItems(
  liveItems: LiveMap<string, LiveObject<PreparationChecklistItem>>,
  currentItems: PreparationChecklistDocument["items"],
  nextItems: PreparationChecklistDocument["items"],
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

export function applyPreparationChecklistMutationToStorage(
  storage: LiveObject<TripItineraryStorage>,
  mutation: PreparationChecklistMutation,
): PreparationChecklistMutationResult {
  const current = readPreparationChecklistFromStorage(storage.toJSON());

  if (!current.success) {
    return current;
  }

  const result = mutation(current.data);

  if (!result.success) {
    return result;
  }

  synchronizeChecklistItems(
    getOrCreateChecklistItems(storage),
    current.data.items,
    result.data.items,
  );
  return result;
}
