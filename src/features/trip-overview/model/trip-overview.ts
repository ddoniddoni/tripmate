import type { TripExpense } from "@/entities/expense/model/trip-expense";
import type { ItineraryDocument } from "@/entities/itinerary/model/trip-itinerary";
import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";

export type TripOverviewAction = "expenses" | "itinerary" | "preparation";

export type TripOverview = {
  completedPreparationCount: number;
  expenseCount: number;
  itineraryItemCount: number;
  nextAction: TripOverviewAction;
  nextActionCopy: { description: string; label: string; title: string };
  plannedDayCount: number;
  preparationItemCount: number;
  totalExpenseAmount: number;
  tripDayCount: number;
};

function getNextAction(
  itineraryItemCount: number,
  preparationItemCount: number,
  completedPreparationCount: number,
  expenseCount: number,
): Pick<TripOverview, "nextAction" | "nextActionCopy"> {
  if (itineraryItemCount === 0) {
    return {
      nextAction: "itinerary",
      nextActionCopy: {
        description: "첫 장소를 추가하면 여행의 하루가 구체적으로 보이기 시작해요.",
        label: "일정 만들기",
        title: "여행의 첫 장면을 정해 볼까요?",
      },
    };
  }

  if (preparationItemCount === 0 || completedPreparationCount < preparationItemCount) {
    const remainingCount = preparationItemCount - completedPreparationCount;

    return {
      nextAction: "preparation",
      nextActionCopy: {
        description:
          remainingCount > 0
            ? `아직 ${remainingCount}개의 준비 항목이 남아 있어요.`
            : "예약과 짐처럼 출발 전에 챙길 일을 함께 나눠 보세요.",
        label: "준비하기 열기",
        title: "출발 전, 함께 챙겨요.",
      },
    };
  }

  if (expenseCount === 0) {
    return {
      nextAction: "expenses",
      nextActionCopy: {
        description: "함께 쓴 돈을 기록해 두면 여행 뒤 정산이 훨씬 가벼워져요.",
        label: "경비 기록하기",
        title: "공동 경비를 미리 정리해 둘까요?",
      },
    };
  }

  return {
    nextAction: "itinerary",
    nextActionCopy: {
      description: "일정, 준비, 경비가 모두 연결되어 있어요. 세부 동선을 마지막으로 확인해 보세요.",
      label: "일정 확인하기",
      title: "여행 준비가 차곡차곡 쌓이고 있어요.",
    },
  };
}

export function createTripOverview({
  expenses,
  itinerary,
  preparationItems,
}: {
  expenses: readonly TripExpense[];
  itinerary: ItineraryDocument;
  preparationItems: readonly PreparationChecklistItem[];
}): TripOverview {
  const itineraryItemCount = Object.keys(itinerary.items).length;
  const plannedDayCount = itinerary.dayOrder.reduce((count, dayId) => {
    return count + (itinerary.days[dayId]?.itemIds.length ? 1 : 0);
  }, 0);
  const completedPreparationCount = preparationItems.filter(
    (item) => item.completedAt !== null,
  ).length;
  const totalExpenseAmount = expenses.reduce((total, expense) => total + expense.amount, 0);

  return {
    completedPreparationCount,
    expenseCount: expenses.length,
    itineraryItemCount,
    plannedDayCount,
    preparationItemCount: preparationItems.length,
    totalExpenseAmount,
    tripDayCount: itinerary.dayOrder.length,
    ...getNextAction(
      itineraryItemCount,
      preparationItems.length,
      completedPreparationCount,
      expenses.length,
    ),
  };
}
