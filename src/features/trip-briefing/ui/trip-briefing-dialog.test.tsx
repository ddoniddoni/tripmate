// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TripExpense } from "@/entities/expense/model/trip-expense";
import { createEmptyTripExpenseSettlementState } from "@/entities/expense/model/trip-expense-settlement-state";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";
import type { TripMember } from "@/entities/trip/model/trip-membership";
import { TripBriefingDialog } from "@/features/trip-briefing/ui/trip-briefing-dialog";

const members: TripMember[] = [
  {
    displayName: "지우",
    role: "owner",
    userId: "user-jiwoo",
  },
  {
    displayName: "민지",
    role: "editor",
    userId: "user-minji",
  },
];

const preparationItems: PreparationChecklistItem[] = [
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
    assigneeId: "user-minji",
    category: "packing",
    completedAt: "2026-04-10T10:00:00.000Z",
    createdAt: "2026-04-10T07:00:00.000Z",
    createdBy: "user-minji",
    dueDate: null,
    id: "sunscreen",
    isPriority: false,
    title: "선크림 챙기기",
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TripBriefingDialog", () => {
  it("shows a travel handoff from the shared itinerary data and opens the print dialog", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(
      <TripBriefingDialog
        currentUserId="user-jiwoo"
        expenses={expenses}
        itinerary={jejuTrip.itinerary}
        members={members}
        preparationItems={preparationItems}
        settlementState={createEmptyTripExpenseSettlementState()}
        trip={jejuTrip.trip}
      />,
    );

    await user.click(screen.getByRole("button", { name: "여행 브리핑" }));

    expect(screen.getByRole("dialog", { name: "여행 브리핑" })).toBeVisible();
    expect(screen.getByRole("article", { name: "봄의 제주 여행 브리핑" })).toBeVisible();
    expect(screen.getByText("우진해장국")).toBeVisible();
    expect(screen.getByText("숙소 예약 확인")).toBeVisible();
    expect(screen.getByText("민지")).toBeVisible();
    expect(screen.getByText("나 · 지우")).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "최근 지출" })).getByText("₩36,000"),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "인쇄 · PDF로 저장" }));

    expect(print).toHaveBeenCalledOnce();
  });
});
