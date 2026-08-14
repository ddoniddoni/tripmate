import { LiveObject } from "@liveblocks/client";
import { describe, expect, it } from "vitest";

import { addTripExpense } from "@/entities/expense/model/trip-expense";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  applyTripExpenseMutationToStorage,
  getLiveblocksTripExpenseSnapshot,
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
});
