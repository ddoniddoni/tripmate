import { LiveMap, LiveObject } from "@liveblocks/client";

import {
  createEmptyTripExpenseDocument,
  tripExpenseDocumentSchema,
  type ExpenseSettlementTransfer,
  type TripExpense,
  type TripExpenseDocument,
  type TripExpenseMutationResult,
} from "@/entities/expense/model/trip-expense";
import {
  createTripExpenseSettlementTransferKey,
  tripExpenseSettlementStateSchema,
  tripExpenseSettlementTransferCompletionSchema,
  type TripExpenseSettlementState,
  type TripExpenseSettlementTransferCompletion,
} from "@/entities/expense/model/trip-expense-settlement-state";
import type { TripItineraryStorage } from "@/features/collaboration/model/liveblocks-itinerary";

export type TripExpenseMutation = (current: TripExpenseDocument) => TripExpenseMutationResult;

type TripExpenseSettlementStateResult =
  | { data: TripExpenseSettlementState; success: true }
  | { code: "invalid-settlement"; message: string; success: false };

export type TripExpenseSettlementCompletionMutationResult =
  | { completed: boolean; success: true }
  | {
      code: "invalid-settlement" | "settlement-changed";
      message: string;
      success: false;
    };

export type TripExpenseSettlementCompletionInput = {
  completedAt: string;
  completedBy: string;
  revision: number;
  transfer: ExpenseSettlementTransfer;
};

function invalidExpenseResult(): TripExpenseMutationResult {
  return {
    code: "invalid-expense",
    message: "공유 경비 데이터를 불러올 수 없습니다.",
    success: false,
  };
}

function invalidSettlementResult(): TripExpenseSettlementStateResult {
  return {
    code: "invalid-settlement",
    message: "정산 완료 상태를 불러올 수 없습니다.",
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

export function readTripExpenseSettlementStateFromStorage(
  storage: unknown,
): TripExpenseSettlementStateResult {
  if (!storage || typeof storage !== "object") {
    return invalidSettlementResult();
  }

  const expenseSettlementCompletions = Object.getOwnPropertyDescriptor(
    storage,
    "expenseSettlementCompletions",
  )?.value;
  const expenseSettlementRevision = Object.getOwnPropertyDescriptor(
    storage,
    "expenseSettlementRevision",
  )?.value;
  const result = tripExpenseSettlementStateSchema.safeParse({
    completedTransfers: expenseSettlementCompletions ?? {},
    revision: expenseSettlementRevision ?? 0,
  });

  return result.success ? { data: result.data, success: true } : invalidSettlementResult();
}

export function getLiveblocksTripExpenseSettlementState(
  storage: unknown,
): TripExpenseSettlementState | null {
  const result = readTripExpenseSettlementStateFromStorage(storage);

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

function getOrCreateExpenseSettlementCompletions(
  storage: LiveObject<TripItineraryStorage>,
): LiveMap<string, LiveObject<TripExpenseSettlementTransferCompletion>> {
  const expenseSettlementCompletions = storage.get("expenseSettlementCompletions");

  if (expenseSettlementCompletions) {
    return expenseSettlementCompletions;
  }

  const nextExpenseSettlementCompletions = new LiveMap<
    string,
    LiveObject<TripExpenseSettlementTransferCompletion>
  >();
  storage.set("expenseSettlementCompletions", nextExpenseSettlementCompletions);
  return nextExpenseSettlementCompletions;
}

function resetExpenseSettlementState(storage: LiveObject<TripItineraryStorage>) {
  const currentSettlementState = getLiveblocksTripExpenseSettlementState(storage.toJSON());
  const completedTransfers = getOrCreateExpenseSettlementCompletions(storage);

  for (const transferKey of completedTransfers.keys()) {
    completedTransfers.delete(transferKey);
  }

  storage.set("expenseSettlementRevision", (currentSettlementState?.revision ?? 0) + 1);
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
  resetExpenseSettlementState(storage);
  return result;
}

export function toggleTripExpenseSettlementTransferCompletionInStorage(
  storage: LiveObject<TripItineraryStorage>,
  input: TripExpenseSettlementCompletionInput,
): TripExpenseSettlementCompletionMutationResult {
  const state = readTripExpenseSettlementStateFromStorage(storage.toJSON());

  if (!state.success) {
    return state;
  }

  if (state.data.revision !== input.revision) {
    return {
      code: "settlement-changed",
      message: "정산 안내가 바뀌어 완료 처리하지 못했습니다. 최신 안내를 확인해 주세요.",
      success: false,
    };
  }

  if (storage.get("expenseSettlementRevision") === undefined) {
    storage.set("expenseSettlementRevision", state.data.revision);
  }

  const transferKey = createTripExpenseSettlementTransferKey(input.transfer);
  const completion = tripExpenseSettlementTransferCompletionSchema.safeParse({
    completedAt: input.completedAt,
    completedBy: input.completedBy,
    revision: input.revision,
    transferKey,
  });

  if (!completion.success) {
    return {
      code: "invalid-settlement",
      message: "정산 완료 정보를 확인해 주세요.",
      success: false,
    };
  }

  const completedTransfers = getOrCreateExpenseSettlementCompletions(storage);

  if (state.data.completedTransfers[transferKey]) {
    completedTransfers.delete(transferKey);
    return { completed: false, success: true };
  }

  completedTransfers.set(transferKey, new LiveObject(completion.data));
  return { completed: true, success: true };
}
