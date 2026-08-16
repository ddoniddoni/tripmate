// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { TripExpense } from "@/entities/expense/model/trip-expense";
import { TripExpenseWorkspaceView } from "@/features/trip-expenses/ui/trip-expense-workspace";

const members = [
  { displayName: "지우", role: "owner" as const, userId: "user-jiwoo" },
  { displayName: "민지", role: "editor" as const, userId: "user-minji" },
];

function ExpenseHarness({ canEditExpenses = true }: { canEditExpenses?: boolean }) {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);

  return (
    <TripExpenseWorkspaceView
      canEditExpenses={canEditExpenses}
      currentUserId="user-jiwoo"
      expenses={expenses}
      members={members}
      onAdd={(values) => {
        setExpenses([
          {
            ...values,
            createdAt: "2026-04-18T10:00:00.000Z",
            createdBy: "user-jiwoo",
            id: "airport-taxi",
          },
        ]);
        return true;
      }}
      onRemove={(expenseId) => {
        setExpenses((currentExpenses) =>
          currentExpenses.filter((expense) => expense.id !== expenseId),
        );
      }}
      statusMessage=""
    />
  );
}

describe("TripExpenseWorkspaceView", () => {
  it("records an expense and shows the resulting settlement", async () => {
    const user = userEvent.setup();
    render(<ExpenseHarness />);

    await user.type(screen.getByLabelText("지출 내용"), "공항 택시");
    await user.type(screen.getByLabelText("금액"), "36000");
    await user.click(screen.getByRole("button", { name: "지출 기록하기" }));

    expect(screen.getByText("공항 택시")).toBeInTheDocument();
    expect(screen.getByLabelText("현재 총 지출 ₩36,000")).toBeInTheDocument();
    expect(screen.getByText("보낼 돈")).toBeInTheDocument();
    expect(screen.getByText(/나 · 지우 결제 · 2명 정산/)).toBeInTheDocument();
    expect(screen.getByText("1인당 ₩18,000")).toBeInTheDocument();
    expect(screen.getByLabelText("공항 택시 참여자별 부담 금액")).not.toBeVisible();
  });

  it("shows an exact split when a person opens an expense's N-bbang details", async () => {
    const user = userEvent.setup();
    render(<ExpenseHarness />);

    await user.type(screen.getByLabelText("지출 내용"), "공항 택시");
    await user.type(screen.getByLabelText("금액"), "36000");
    await user.click(screen.getByRole("button", { name: "지출 기록하기" }));
    await user.click(screen.getByText("1인당 ₩18,000"));

    expect(screen.getByLabelText("공항 택시 참여자별 부담 금액")).toBeVisible();
    expect(screen.getAllByText("₩18,000")).toHaveLength(5);
  });

  it("keeps a viewer read-only while showing the expense ledger", () => {
    render(<ExpenseHarness canEditExpenses={false} />);

    expect(screen.getByText("보기 전용 권한에서는 경비를 변경할 수 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지출 기록하기" })).not.toBeInTheDocument();
  });

  it("labels a fully balanced expense as settled", () => {
    render(
      <TripExpenseWorkspaceView
        canEditExpenses={false}
        currentUserId="user-jiwoo"
        expenses={[
          {
            amount: 12_000,
            category: "food",
            createdAt: "2026-04-18T10:00:00.000Z",
            createdBy: "user-jiwoo",
            id: "solo-coffee",
            paidBy: "user-jiwoo",
            participantIds: ["user-jiwoo"],
            title: "혼자 마신 커피",
          },
        ]}
        members={members}
        onAdd={() => false}
        onRemove={() => undefined}
        statusMessage=""
      />,
    );

    expect(screen.getByText("이미 정산이 완료됐어요.")).toBeInTheDocument();
  });
});
