// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { TripExpense } from "@/entities/expense/model/trip-expense";
import {
  createEmptyTripExpenseSettlementState,
  createTripExpenseSettlementTransferKey,
  type TripExpenseSettlementState,
} from "@/entities/expense/model/trip-expense-settlement-state";
import { TripExpenseWorkspaceView } from "@/features/trip-expenses/ui/trip-expense-workspace";

const members = [
  { displayName: "지우", role: "owner" as const, userId: "user-jiwoo" },
  { displayName: "민지", role: "editor" as const, userId: "user-minji" },
];

const sharedTaxiExpense: TripExpense = {
  amount: 36_000,
  category: "transport",
  createdAt: "2026-04-18T10:00:00.000Z",
  createdBy: "user-jiwoo",
  id: "airport-taxi",
  paidBy: "user-jiwoo",
  participantIds: ["user-jiwoo", "user-minji"],
  title: "공항 택시",
};

const dinnerExpense: TripExpense = {
  amount: 48_000,
  category: "food",
  createdAt: "2026-04-18T12:00:00.000Z",
  createdBy: "user-minji",
  id: "black-pork-dinner",
  paidBy: "user-minji",
  participantIds: ["user-jiwoo", "user-minji"],
  title: "흑돼지 저녁",
};

function ExpenseHarness({ canEditExpenses = true }: { canEditExpenses?: boolean }) {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [settlementState, setSettlementState] = useState<TripExpenseSettlementState>(
    createEmptyTripExpenseSettlementState,
  );

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
      onUpdate={(expenseId, values) => {
        setExpenses((currentExpenses) =>
          currentExpenses.map((expense) =>
            expense.id === expenseId ? { ...expense, ...values } : expense,
          ),
        );
        return true;
      }}
      onRemove={(expenseId) => {
        setExpenses((currentExpenses) =>
          currentExpenses.filter((expense) => expense.id !== expenseId),
        );
      }}
      onToggleTransferCompletion={(transfer) => {
        const transferKey = createTripExpenseSettlementTransferKey(transfer);

        setSettlementState((currentState) => {
          const currentCompletion = currentState.completedTransfers[transferKey];

          if (currentCompletion) {
            const completedTransfers = { ...currentState.completedTransfers };
            delete completedTransfers[transferKey];
            return { ...currentState, completedTransfers };
          }

          return {
            ...currentState,
            completedTransfers: {
              ...currentState.completedTransfers,
              [transferKey]: {
                completedAt: "2026-04-18T12:00:00.000Z",
                completedBy: "user-jiwoo",
                revision: currentState.revision,
                transferKey,
              },
            },
          };
        });
      }}
      settlementState={settlementState}
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

  it("keeps settlement completion controls hidden for a viewer", () => {
    render(
      <TripExpenseWorkspaceView
        canEditExpenses={false}
        currentUserId="user-jiwoo"
        expenses={[sharedTaxiExpense]}
        members={members}
        onAdd={() => false}
        onUpdate={() => false}
        onRemove={() => undefined}
        onToggleTransferCompletion={() => undefined}
        settlementState={createEmptyTripExpenseSettlementState()}
        statusMessage=""
      />,
    );

    expect(screen.getByText("송금 대기")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /송금 완료 처리/ })).not.toBeInTheDocument();
  });

  it("filters the local expense ledger without changing the settlement", async () => {
    const user = userEvent.setup();
    render(
      <TripExpenseWorkspaceView
        canEditExpenses={false}
        currentUserId="user-jiwoo"
        expenses={[sharedTaxiExpense, dinnerExpense]}
        members={members}
        onAdd={() => false}
        onRemove={() => undefined}
        onToggleTransferCompletion={() => undefined}
        onUpdate={() => false}
        settlementState={createEmptyTripExpenseSettlementState()}
        statusMessage=""
      />,
    );

    await user.click(screen.getByRole("button", { name: "식비, 1건" }));

    expect(screen.getByText("흑돼지 저녁")).toBeInTheDocument();
    expect(screen.queryByText("공항 택시")).not.toBeInTheDocument();
    expect(screen.getByLabelText("지출 1건")).toBeInTheDocument();
    expect(screen.getByLabelText("현재 총 지출 ₩84,000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "숙소, 0건" }));

    expect(screen.getByText("숙소 지출이 없어요.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "전체 지출 보기" }));

    expect(screen.getByText("공항 택시")).toBeInTheDocument();
    expect(screen.getByText("흑돼지 저녁")).toBeInTheDocument();
  });

  it("shows shared progress and lets an editor mark a transfer as sent", async () => {
    const user = userEvent.setup();
    render(<ExpenseHarness />);

    await user.type(screen.getByLabelText("지출 내용"), "공항 택시");
    await user.type(screen.getByLabelText("금액"), "36000");
    await user.click(screen.getByRole("button", { name: "지출 기록하기" }));
    await user.click(
      screen.getByRole("button", {
        name: "민지에서 나 · 지우에게 ₩18,000 송금 완료 처리",
      }),
    );

    expect(screen.getByText("1/1건 완료")).toBeInTheDocument();
    expect(screen.getByText("완료 처리: 나 · 지우")).toBeInTheDocument();
    expect(screen.getByText("모든 송금이 완료됐어요.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "민지에서 나 · 지우에게 ₩18,000 송금 완료 취소" }),
    ).toBeInTheDocument();
  });

  it("lets an editor correct an expense and recalculates the settlement", async () => {
    const user = userEvent.setup();
    render(<ExpenseHarness />);

    await user.type(screen.getByLabelText("지출 내용"), "공항 택시");
    await user.type(screen.getByLabelText("금액"), "36000");
    await user.click(screen.getByRole("button", { name: "지출 기록하기" }));
    await user.click(screen.getByRole("button", { name: "공항 택시 지출 수정" }));

    expect(screen.getByText("지출 수정")).toBeInTheDocument();
    expect(screen.getByLabelText("금액")).toHaveValue(36_000);

    await user.clear(screen.getByLabelText("금액"));
    await user.type(screen.getByLabelText("금액"), "40000");
    await user.click(screen.getByRole("button", { name: "수정 저장" }));

    expect(screen.getByLabelText("현재 총 지출 ₩40,000")).toBeInTheDocument();
    expect(screen.getByText("1인당 ₩20,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지출 기록하기" })).toBeInTheDocument();
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
        onUpdate={() => false}
        onRemove={() => undefined}
        onToggleTransferCompletion={() => undefined}
        settlementState={createEmptyTripExpenseSettlementState()}
        statusMessage=""
      />,
    );

    expect(screen.getByText("이미 정산이 완료됐어요.")).toBeInTheDocument();
  });
});
