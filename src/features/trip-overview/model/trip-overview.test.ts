import { describe, expect, it } from "vitest";

import type { TripExpense } from "@/entities/expense/model/trip-expense";
import { createEmptyTripExpenseSettlementState } from "@/entities/expense/model/trip-expense-settlement-state";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";
import { createTripOverview } from "@/features/trip-overview/model/trip-overview";

const completeChecklistItem: PreparationChecklistItem = {
  assigneeId: "user-jiwoo",
  category: "booking",
  completedAt: "2026-04-10T09:00:00.000Z",
  createdAt: "2026-04-09T09:00:00.000Z",
  createdBy: "user-jiwoo",
  dueDate: null,
  id: "hotel",
  isPriority: false,
  title: "숙소 예약 확인",
};

const sampleExpense: TripExpense = {
  amount: 48_000,
  category: "food",
  createdAt: "2026-04-18T10:00:00.000Z",
  createdBy: "user-jiwoo",
  id: "dinner",
  paidBy: "user-jiwoo",
  participantIds: ["user-jiwoo"],
  title: "저녁 식사",
};

describe("createTripOverview", () => {
  it("summarizes itinerary, preparation, and expense progress", () => {
    const overview = createTripOverview({
      expenses: [sampleExpense],
      itinerary: jejuTrip.itinerary,
      memberIds: ["user-jiwoo"],
      preparationItems: [completeChecklistItem, { ...completeChecklistItem, completedAt: null, id: "bags" }],
      settlementState: createEmptyTripExpenseSettlementState(),
    });

    expect(overview).toMatchObject({
      completedPreparationCount: 1,
      expenseCount: 1,
      itineraryItemCount: 3,
      nextAction: "preparation",
      plannedDayCount: 1,
      preparationItemCount: 2,
      settlementProgressCopy: "송금이 필요 없어요.",
      settlementTransferCount: 0,
      totalExpenseAmount: 48_000,
      tripDayCount: 4,
    });
    expect(overview.nextActionCopy.description).toBe("아직 1개의 준비 항목이 남아 있어요.");
  });

  it("guides an empty trip to create its first itinerary item", () => {
    const overview = createTripOverview({
      expenses: [],
      itinerary: {
        dayOrder: ["day-1"],
        days: { "day-1": { date: "2026-04-18", id: "day-1", itemIds: [], tripId: "jeju-trip" } },
        items: {},
        placeSuggestions: {},
      },
      memberIds: ["user-jiwoo"],
      preparationItems: [],
      settlementState: createEmptyTripExpenseSettlementState(),
    });

    expect(overview.nextAction).toBe("itinerary");
    expect(overview.nextActionCopy.label).toBe("일정 만들기");
  });

  it("guides a fully prepared trip to complete its outstanding settlement", () => {
    const sharedExpense: TripExpense = {
      ...sampleExpense,
      participantIds: ["user-jiwoo", "user-minji"],
    };
    const overview = createTripOverview({
      expenses: [sharedExpense],
      itinerary: jejuTrip.itinerary,
      memberIds: ["user-jiwoo", "user-minji"],
      preparationItems: [completeChecklistItem],
      settlementState: {
        completedTransfers: {},
        revision: 1,
      },
    });

    expect(overview).toMatchObject({
      completedSettlementTransferCount: 0,
      nextAction: "expenses",
      settlementProgressCopy: "송금 0/1건 완료",
      settlementTransferCount: 1,
    });
    expect(overview.nextActionCopy).toEqual({
      description: "아직 1건의 송금이 남아 있어요.",
      label: "정산 확인하기",
      title: "마지막 정산을 확인해요.",
    });

  });
});
