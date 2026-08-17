import {
  calculateTripExpenseSettlement,
  type TripExpense,
  type TripExpenseSettlement,
} from "@/entities/expense/model/trip-expense";
import {
  getTripExpenseSettlementProgress,
  type TripExpenseSettlementState,
} from "@/entities/expense/model/trip-expense-settlement-state";
import type {
  ItineraryDocument,
  ItineraryItem,
  TripDay,
} from "@/entities/itinerary/model/trip-itinerary";
import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";

export type TripBriefingDay = {
  day: TripDay;
  items: ItineraryItem[];
};

export type TripBriefing = {
  days: TripBriefingDay[];
  expenses: readonly TripExpense[];
  incompletePreparationItems: readonly PreparationChecklistItem[];
  preparation: {
    completedCount: number;
    priorityIncompleteCount: number;
    totalCount: number;
  };
  settlement: TripExpenseSettlement;
  settlementProgress: ReturnType<typeof getTripExpenseSettlementProgress>;
};

function getOrderedDays(itinerary: ItineraryDocument): TripBriefingDay[] {
  return itinerary.dayOrder.flatMap((dayId) => {
    const day = itinerary.days[dayId];

    if (!day) {
      return [];
    }

    return [
      {
        day,
        items: day.itemIds.flatMap((itemId) => {
          const item = itinerary.items[itemId];

          return item ? [item] : [];
        }),
      },
    ];
  });
}

function getIncompletePreparationItems(items: readonly PreparationChecklistItem[]) {
  return items
    .filter((item) => item.completedAt === null)
    .toSorted((left, right) => {
      if (left.isPriority !== right.isPriority) {
        return Number(right.isPriority) - Number(left.isPriority);
      }

      const leftDueDate = left.dueDate ?? "9999-12-31";
      const rightDueDate = right.dueDate ?? "9999-12-31";

      return (
        leftDueDate.localeCompare(rightDueDate) ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.title.localeCompare(right.title, "ko")
      );
    });
}

export function createTripBriefing({
  expenses,
  itinerary,
  memberIds,
  preparationItems,
  settlementState,
}: {
  expenses: readonly TripExpense[];
  itinerary: ItineraryDocument;
  memberIds: readonly string[];
  preparationItems: readonly PreparationChecklistItem[];
  settlementState: TripExpenseSettlementState;
}): TripBriefing {
  const incompletePreparationItems = getIncompletePreparationItems(preparationItems);
  const settlement = calculateTripExpenseSettlement(expenses, memberIds);

  return {
    days: getOrderedDays(itinerary),
    expenses: expenses.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt)),
    incompletePreparationItems,
    preparation: {
      completedCount: preparationItems.length - incompletePreparationItems.length,
      priorityIncompleteCount: incompletePreparationItems.filter((item) => item.isPriority).length,
      totalCount: preparationItems.length,
    },
    settlement,
    settlementProgress: getTripExpenseSettlementProgress(settlement.transfers, settlementState),
  };
}
