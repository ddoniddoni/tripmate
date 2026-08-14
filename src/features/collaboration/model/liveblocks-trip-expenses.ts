import { LiveMap, LiveObject } from "@liveblocks/client";

import {
  createEmptyTripExpenseDocument,
  tripExpenseDocumentSchema,
  type TripExpense,
  type TripExpenseDocument,
  type TripExpenseMutationResult,
} from "@/entities/expense/model/trip-expense";
import type { TripItineraryStorage } from "@/features/collaboration/model/liveblocks-itinerary";

export type TripExpenseMutation = (current: TripExpenseDocument) => TripExpenseMutationResult;

function invalidExpenseResult(): TripExpenseMutationResult {
  return {
    code: "invalid-expense",
    message: "공유 경비 데이터를 불러올 수 없습니다.",
    success: false,
  };
}

export function readTripExpensesFromStorage(storage: unknown): TripExpenseMutationResult {
  if (!storage || typeof storage !== "object") {
    return invalidExpenseResult();
  }

  const expenseItems = Object.getOwnPropertyDescriptor(storage, "expenseItems")?.value;

  if (expenseItems === undefined) {
    return { data: createEmptyTripExpenseDocument(), success: true };
  }

  const result = tripExpenseDocumentSchema.safeParse({ items: expenseItems });

  return result.success ? { data: result.data, success: true } : invalidExpenseResult();
}

export function getLiveblocksTripExpenseSnapshot(storage: unknown): TripExpenseDocument | null {
  const result = readTripExpensesFromStorage(storage);

  return result.success ? result.data : null;
}

function getExpensePatch(currentExpense: TripExpense, nextExpense: TripExpense): Partial<TripExpense> {
  const patch: Partial<TripExpense> = {};

  if (currentExpense.amount !== nextExpense.amount) {
    patch.amount = nextExpense.amount;
  }

  if (currentExpense.category !== nextExpense.category) {
    patch.category = nextExpense.category;
  }

  if (currentExpense.createdAt !== nextExpense.createdAt) {
    patch.createdAt = nextExpense.createdAt;
  }

  if (currentExpense.createdBy !== nextExpense.createdBy) {
    patch.createdBy = nextExpense.createdBy;
  }

  if (currentExpense.paidBy !== nextExpense.paidBy) {
    patch.paidBy = nextExpense.paidBy;
  }

  if (JSON.stringify(currentExpense.participantIds) !== JSON.stringify(nextExpense.participantIds)) {
    patch.participantIds = nextExpense.participantIds;
  }

  if (currentExpense.title !== nextExpense.title) {
    patch.title = nextExpense.title;
  }

  return patch;
}

function getOrCreateExpenseItems(
  storage: LiveObject<TripItineraryStorage>,
): LiveMap<string, LiveObject<TripExpense>> {
  const expenseItems = storage.get("expenseItems");

  if (expenseItems) {
    return expenseItems;
  }

  const nextExpenseItems = new LiveMap<string, LiveObject<TripExpense>>();
  storage.set("expenseItems", nextExpenseItems);
  return nextExpenseItems;
}

function synchronizeExpenseItems(
  liveItems: LiveMap<string, LiveObject<TripExpense>>,
  currentItems: TripExpenseDocument["items"],
  nextItems: TripExpenseDocument["items"],
) {
  for (const expenseId of liveItems.keys()) {
    if (!nextItems[expenseId]) {
      liveItems.delete(expenseId);
    }
  }

  Object.values(nextItems).forEach((nextExpense) => {
    const liveExpense = liveItems.get(nextExpense.id);

    if (!liveExpense) {
      liveItems.set(nextExpense.id, new LiveObject(nextExpense));
      return;
    }

    const currentExpense = currentItems[nextExpense.id];

    if (!currentExpense) {
      liveExpense.update(nextExpense);
      return;
    }

    const patch = getExpensePatch(currentExpense, nextExpense);

    if (Object.keys(patch).length > 0) {
      liveExpense.update(patch);
    }
  });
}

export function applyTripExpenseMutationToStorage(
  storage: LiveObject<TripItineraryStorage>,
  mutation: TripExpenseMutation,
): TripExpenseMutationResult {
  const current = readTripExpensesFromStorage(storage.toJSON());

  if (!current.success) {
    return current;
  }

  const result = mutation(current.data);

  if (!result.success) {
    return result;
  }

  synchronizeExpenseItems(getOrCreateExpenseItems(storage), current.data.items, result.data.items);
  return result;
}
