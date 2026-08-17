import { describe, expect, it } from "vitest";

import type { TripExpense } from "@/entities/expense/model/trip-expense";
import { createEmptyTripExpenseSettlementState } from "@/entities/expense/model/trip-expense-settlement-state";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";
import { createTripBriefing } from "@/features/trip-briefing/model/create-trip-briefing";

const preparationItems: PreparationChecklistItem[] = [
  {
    assigneeId: "user-minji",
    category: "packing",
    completedAt: null,
    createdAt: "2026-04-10T09:00:00.000Z",
    createdBy: "user-jiwoo",
    dueDate: "2026-04-17",
    id: "sunscreen",
    isPriority: false,
    title: "선크림 챙기기",
  },
  {
    assigneeId: "user-jiwoo",
    category: "booking",
    completedAt: null,
    createdAt: "2026-04-10T08:00:00.000Z",
    createdBy: "user-jiwoo",
    dueDate: "2026-04-16",
    id: "hotel",
    isPriority: true,
    title: "숙소 예약 확인",
  },
  {
    assigneeId: "user-jiwoo",
    category: "transport",
    completedAt: "2026-04-10T10:00:00.000Z",
    createdAt: "2026-04-10T07:00:00.000Z",
    createdBy: "user-jiwoo",
    dueDate: null,
    id: "boarding-pass",
    isPriority: false,
    title: "탑승권 저장",
  },
];

const expenses: TripExpense[] = [
  {
    amount: 36_000,
    category: "transport",
    createdAt: "2026-04-18T10:00:00.000Z",
    createdBy: "user-jiwoo",
    id: "airport-taxi",
    paidBy: "user-jiwoo",
    participantIds: ["user-jiwoo", "user-minji"],
    title: "공항 택시",
  },
];

describe("createTripBriefing", () => {
  it("keeps the itinerary order and combines preparation with settlement summaries", () => {
    const briefing = createTripBriefing({
      expenses,
      itinerary: jejuTrip.itinerary,
      memberIds: ["user-jiwoo", "user-minji"],
      preparationItems,
      settlementState: createEmptyTripExpenseSettlementState(),
    });

    expect(briefing.days[0]?.items.map((item) => item.id)).toEqual([
      "woojin-breakfast",
      "hamdeok-beach",
      "bijarim-forest",
    ]);
    expect(briefing.preparation).toEqual({
      completedCount: 1,
      priorityIncompleteCount: 1,
      totalCount: 3,
    });
    expect(briefing.incompletePreparationItems.map((item) => item.id)).toEqual([
      "hotel",
      "sunscreen",
    ]);
    expect(briefing.settlement).toMatchObject({
      totalAmount: 36_000,
      transfers: [{ amount: 18_000, fromUserId: "user-minji", toUserId: "user-jiwoo" }],
    });
    expect(briefing.settlementProgress).toMatchObject({
      completedTransferCount: 0,
      totalTransferCount: 1,
    });
  });
});
