import { describe, expect, it } from "vitest";

import {
  createEmptyTripExpenseSettlementState,
  createTripExpenseSettlementTransferKey,
  getTripExpenseSettlementProgress,
  tripExpenseSettlementStateSchema,
} from "@/entities/expense/model/trip-expense-settlement-state";

const transfer = {
  amount: 18_000,
  fromUserId: "user-minji",
  toUserId: "user-jiwoo",
};

describe("trip expense settlement state", () => {
  it("counts only completions from the current settlement revision", () => {
    const transferKey = createTripExpenseSettlementTransferKey(transfer);
    const state = {
      completedTransfers: {
        [transferKey]: {
          completedAt: "2026-04-18T12:00:00.000Z",
          completedBy: "user-minji",
          revision: 2,
          transferKey,
        },
      },
      revision: 2,
    };

    expect(getTripExpenseSettlementProgress([transfer], state)).toEqual({
      allTransfersCompleted: true,
      completedTransferCount: 1,
      totalTransferCount: 1,
    });
    expect(getTripExpenseSettlementProgress([transfer], createEmptyTripExpenseSettlementState())).toEqual({
      allTransfersCompleted: false,
      completedTransferCount: 0,
      totalTransferCount: 1,
    });
  });

  it("rejects a completion record that does not match its map key or revision", () => {
    expect(
      tripExpenseSettlementStateSchema.safeParse({
        completedTransfers: {
          "different-transfer": {
            completedAt: "2026-04-18T12:00:00.000Z",
            completedBy: "user-minji",
            revision: 1,
            transferKey: createTripExpenseSettlementTransferKey(transfer),
          },
        },
        revision: 2,
      }).success,
    ).toBe(false);
  });
});
