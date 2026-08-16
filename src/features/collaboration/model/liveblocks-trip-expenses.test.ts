import { LiveObject } from "@liveblocks/client";
import { describe, expect, it } from "vitest";

import { addTripExpense, updateTripExpense } from "@/entities/expense/model/trip-expense";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  applyTripExpenseMutationToStorage,
  getLiveblocksTripExpenseSnapshot,
  getLiveblocksTripExpenseSettlementState,
  toggleTripExpenseSettlementTransferCompletionInStorage,
} from "@/features/collaboration/model/liveblocks-trip-expenses";
import { createTripItineraryStorage } from "@/features/collaboration/model/liveblocks-itinerary";

function createStorageRoot() {
  return new LiveObject(createTripItineraryStorage(jejuTrip.itinerary));
}

const expense = {
  amount: 36_000,
  category: "transport" as const,
  createdAt: "2026-04-18T10:00:00.000Z",
  createdBy: "user-jiwoo",
  id: "airport-taxi",
  paidBy: "user-jiwoo",
  participantIds: ["user-jiwoo", "user-minji"],
  title: "공항 택시",
};

describe("Liveblocks trip expense storage", () => {
  it("persists a shared expense without changing the itinerary document", () => {
    const storage = createStorageRoot();
    const result = applyTripExpenseMutationToStorage(storage, (current) =>
      addTripExpense(current, expense),
    );

    expect(result.success).toBe(true);
    expect(getLiveblocksTripExpenseSnapshot(storage.toJSON())).toEqual({
      items: { "airport-taxi": expense },
    });
    expect(storage.toJSON().items).toEqual(jejuTrip.itinerary.items);
  });

  it("initializes the expense collection in an existing room", () => {
    const storage = createStorageRoot();
    storage.delete("expenseItems");

    const result = applyTripExpenseMutationToStorage(storage, (current) =>
      addTripExpense(current, expense),
    );

    expect(result.success).toBe(true);
    expect(getLiveblocksTripExpenseSnapshot(storage.toJSON())?.items["airport-taxi"]).toEqual(
      expense,
    );
  });

  it("clears completion records when a shared expense changes the settlement", () => {
    const storage = createStorageRoot();
    const added = applyTripExpenseMutationToStorage(storage, (current) =>
      addTripExpense(current, expense),
    );

    expect(added.success).toBe(true);
    expect(getLiveblocksTripExpenseSettlementState(storage.toJSON())).toEqual({
      completedTransfers: {},
      revision: 1,
    });

    const completed = toggleTripExpenseSettlementTransferCompletionInStorage(storage, {
      completedAt: "2026-04-18T12:00:00.000Z",
      completedBy: "user-minji",
      revision: 1,
      transfer: { amount: 18_000, fromUserId: "user-minji", toUserId: "user-jiwoo" },
    });

    expect(completed).toEqual({ completed: true, success: true });
    expect(
      Object.values(getLiveblocksTripExpenseSettlementState(storage.toJSON())?.completedTransfers ?? {}),
    ).toHaveLength(1);

    const updatedExpense = applyTripExpenseMutationToStorage(storage, (current) =>
      updateTripExpense(current, {
        changes: {
          amount: 40_000,
          category: "transport",
          paidBy: "user-jiwoo",
          participantIds: ["user-jiwoo", "user-minji"],
          title: "공항 택시 수정",
        },
        expenseId: expense.id,
      }),
    );

    expect(updatedExpense.success).toBe(true);
    expect(getLiveblocksTripExpenseSettlementState(storage.toJSON())).toEqual({
      completedTransfers: {},
      revision: 2,
    });
  });

  it("refuses a completion action from an outdated settlement revision", () => {
    const storage = createStorageRoot();

    expect(
      toggleTripExpenseSettlementTransferCompletionInStorage(storage, {
        completedAt: "2026-04-18T12:00:00.000Z",
        completedBy: "user-minji",
        revision: 1,
        transfer: { amount: 18_000, fromUserId: "user-minji", toUserId: "user-jiwoo" },
      }),
    ).toMatchObject({ code: "settlement-changed", success: false });
  });

  it("initializes completion storage for an existing room without settlement state", () => {
    const storage = createStorageRoot();
    storage.delete("expenseSettlementCompletions");
    storage.delete("expenseSettlementRevision");

    const completed = toggleTripExpenseSettlementTransferCompletionInStorage(storage, {
      completedAt: "2026-04-18T12:00:00.000Z",
      completedBy: "user-minji",
      revision: 0,
      transfer: { amount: 18_000, fromUserId: "user-minji", toUserId: "user-jiwoo" },
    });

    expect(completed).toEqual({ completed: true, success: true });
    expect(getLiveblocksTripExpenseSettlementState(storage.toJSON())).toEqual({
      completedTransfers: {
        '["user-minji","user-jiwoo",18000]': {
          completedAt: "2026-04-18T12:00:00.000Z",
          completedBy: "user-minji",
          revision: 0,
          transferKey: '["user-minji","user-jiwoo",18000]',
        },
      },
      revision: 0,
    });
  });
});
