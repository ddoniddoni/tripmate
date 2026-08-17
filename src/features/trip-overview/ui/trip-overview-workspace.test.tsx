// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import { createEmptyTripExpenseSettlementState } from "@/entities/expense/model/trip-expense-settlement-state";
import { createTripOverview } from "@/features/trip-overview/model/trip-overview";
import { TripOverviewWorkspaceView } from "@/features/trip-overview/ui/trip-overview-workspace";

const jejuDays = jejuTrip.itinerary.dayOrder.flatMap((dayId) => {
  const day = jejuTrip.itinerary.days[dayId];

  return day ? [day] : [];
});

describe("TripOverviewWorkspaceView", () => {
  it("shows combined trip progress and opens the recommended workspace", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const overview = createTripOverview({
      expenses: [],
      itinerary: jejuTrip.itinerary,
      memberIds: ["user-jiwoo"],
      preparationItems: [],
      settlementState: createEmptyTripExpenseSettlementState(),
    });

    render(
      <TripOverviewWorkspaceView
        days={jejuDays}
        onNavigate={onNavigate}
        onSelectDay={vi.fn()}
        overview={overview}
        selectedDayId={jejuDays[0]?.id ?? ""}
        trip={jejuTrip.trip}
      />,
    );

    expect(screen.getByRole("heading", { name: "봄의 제주" })).toBeInTheDocument();
    expect(screen.getByText("3곳")).toBeInTheDocument();
    expect(screen.getByText("출발 전, 함께 챙겨요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "준비하기 열기" }));

    expect(onNavigate).toHaveBeenCalledWith("preparation");
  });

  it("keeps direct workspace shortcuts available", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const overview = createTripOverview({
      expenses: [],
      itinerary: jejuTrip.itinerary,
      memberIds: ["user-jiwoo"],
      preparationItems: [],
      settlementState: createEmptyTripExpenseSettlementState(),
    });

    render(
      <TripOverviewWorkspaceView
        days={jejuDays}
        onNavigate={onNavigate}
        onSelectDay={vi.fn()}
        overview={overview}
        selectedDayId={jejuDays[0]?.id ?? ""}
        trip={jejuTrip.trip}
      />,
    );

    await user.click(screen.getByRole("button", { name: "경비로 이동" }));

    expect(onNavigate).toHaveBeenCalledWith("expenses");
  });

  it("shows outstanding settlement progress and opens the expense workspace", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const overview = createTripOverview({
      expenses: [
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
      ],
      itinerary: jejuTrip.itinerary,
      memberIds: ["user-jiwoo", "user-minji"],
      preparationItems: [
        {
          assigneeId: "user-jiwoo",
          category: "booking",
          completedAt: "2026-04-10T09:00:00.000Z",
          createdAt: "2026-04-09T09:00:00.000Z",
          createdBy: "user-jiwoo",
          dueDate: null,
          id: "hotel",
          isPriority: false,
          title: "숙소 예약 확인",
        },
      ],
      settlementState: createEmptyTripExpenseSettlementState(),
    });

    render(
      <TripOverviewWorkspaceView
        days={jejuDays}
        onNavigate={onNavigate}
        onSelectDay={vi.fn()}
        overview={overview}
        selectedDayId={jejuDays[0]?.id ?? ""}
        trip={jejuTrip.trip}
      />,
    );

    expect(
      within(screen.getByRole("region", { name: "여행 현황" })).getByText("송금 0/1건 완료"),
    ).toBeInTheDocument();
    expect(screen.getByText("마지막 정산을 확인해요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "정산 확인하기" }));

    expect(onNavigate).toHaveBeenCalledWith("expenses");
  });

  it("opens the itinerary on the selected trip day", async () => {
    const onSelectDay = vi.fn();
    const user = userEvent.setup();
    const overview = createTripOverview({
      expenses: [],
      itinerary: jejuTrip.itinerary,
      memberIds: ["user-jiwoo"],
      preparationItems: [],
      settlementState: createEmptyTripExpenseSettlementState(),
    });

    render(
      <TripOverviewWorkspaceView
        days={jejuDays}
        onNavigate={vi.fn()}
        onSelectDay={onSelectDay}
        overview={overview}
        selectedDayId={jejuDays[0]?.id ?? ""}
        trip={jejuTrip.trip}
      />,
    );

    await user.click(screen.getByRole("button", { name: "2일차 일정 열기" }));

    expect(onSelectDay).toHaveBeenCalledWith("jeju-day-2");
  });
});
