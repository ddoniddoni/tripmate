import { describe, expect, it } from "vitest";

import {
  addTripExpense,
  calculateTripExpenseParticipantShares,
  calculateTripExpenseSettlement,
  createEmptyTripExpenseDocument,
  removeTripExpense,
  updateTripExpense,
} from "@/entities/expense/model/trip-expense";

const dinnerExpense = {
  amount: 100_000,
  category: "food" as const,
  createdAt: "2026-04-18T10:00:00.000Z",
  createdBy: "user-jiwoo",
  id: "black-pork-dinner",
  paidBy: "user-jiwoo",
  participantIds: ["user-jiwoo", "user-minji", "user-daniel"],
  title: "흑돼지 저녁",
};

describe("trip expense domain", () => {
  it("adds and removes a validated shared expense", () => {
    const added = addTripExpense(createEmptyTripExpenseDocument(), dinnerExpense);

    expect(added.success).toBe(true);

    if (!added.success) {
      throw new Error("expense should be added");
    }

    expect(removeTripExpense(added.data, dinnerExpense.id)).toEqual({
      data: { items: {} },
      success: true,
    });
  });

  it("splits amounts deterministically and derives the minimum settlement transfers", () => {
    const coffeeExpense = {
      amount: 10_000,
      category: "food" as const,
      createdAt: "2026-04-18T11:00:00.000Z",
      createdBy: "user-minji",
      id: "coffee",
      paidBy: "user-minji",
      participantIds: ["user-jiwoo", "user-minji"],
      title: "카페",
    };
    const settlement = calculateTripExpenseSettlement(
      [dinnerExpense, coffeeExpense],
      ["user-jiwoo", "user-minji", "user-daniel"],
    );

    expect(settlement.totalAmount).toBe(110_000);
    expect(settlement.balances).toEqual([
      { balance: -33_334, owedAmount: 33_334, paidAmount: 0, userId: "user-daniel" },
      { balance: 61_667, owedAmount: 38_333, paidAmount: 100_000, userId: "user-jiwoo" },
      { balance: -28_333, owedAmount: 38_333, paidAmount: 10_000, userId: "user-minji" },
    ]);
    expect(settlement.transfers).toEqual([
      { amount: 33_334, fromUserId: "user-daniel", toUserId: "user-jiwoo" },
      { amount: 28_333, fromUserId: "user-minji", toUserId: "user-jiwoo" },
    ]);
  });

  it("assigns won remainders in a stable order for each participant", () => {
    expect(
      calculateTripExpenseParticipantShares({
        ...dinnerExpense,
        amount: 10_000,
        participantIds: ["user-minji", "user-jiwoo", "user-daniel"],
      }),
    ).toEqual([
      { amount: 3_334, userId: "user-daniel" },
      { amount: 3_333, userId: "user-jiwoo" },
      { amount: 3_333, userId: "user-minji" },
    ]);
  });

  it("rejects an expense when the payer does not join the settlement", () => {
    const result = addTripExpense(createEmptyTripExpenseDocument(), {
      ...dinnerExpense,
      participantIds: ["user-minji"],
    });

    expect(result).toMatchObject({ code: "invalid-expense", success: false });
  });

  it("updates an expense without changing its stable metadata", () => {
    const added = addTripExpense(createEmptyTripExpenseDocument(), dinnerExpense);

    if (!added.success) {
      throw new Error("expense should be added");
    }

    expect(
      updateTripExpense(added.data, {
        changes: {
          amount: 120_000,
          category: "food",
          paidBy: "user-minji",
          participantIds: ["user-jiwoo", "user-minji"],
          title: "흑돼지 저녁 2차",
        },
        expenseId: dinnerExpense.id,
      }),
    ).toEqual({
      data: {
        items: {
          [dinnerExpense.id]: {
            ...dinnerExpense,
            amount: 120_000,
            paidBy: "user-minji",
            participantIds: ["user-jiwoo", "user-minji"],
            title: "흑돼지 저녁 2차",
          },
        },
      },
      success: true,
    });
  });
});
