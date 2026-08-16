import { z } from "@/shared/lib/zod";

const stableIdSchema = z.string().trim().min(1).max(100);

export const tripExpenseCategorySchema = z.enum([
  "food",
  "transport",
  "stay",
  "activity",
  "other",
]);

export const tripExpenseSchema = z
  .object({
    amount: z
      .number()
      .int("금액은 원 단위 정수로 입력해 주세요.")
      .min(1, "금액은 1원 이상이어야 합니다.")
      .max(100_000_000, "한 번에 입력할 수 있는 금액은 1억 원까지입니다."),
    category: tripExpenseCategorySchema,
    createdAt: z.iso.datetime({ offset: true }),
    createdBy: stableIdSchema,
    id: stableIdSchema,
    paidBy: stableIdSchema,
    participantIds: z.array(stableIdSchema).min(1, "참여자를 한 명 이상 선택해 주세요."),
    title: z.string().trim().min(1, "지출 내용을 입력해 주세요.").max(160),
  })
  .superRefine((expense, context) => {
    const participantIds = new Set<string>();

    expense.participantIds.forEach((participantId, index) => {
      if (participantIds.has(participantId)) {
        context.addIssue({
          code: "custom",
          message: "같은 참여자를 중복해 선택할 수 없습니다.",
          path: ["participantIds", index],
        });
      }

      participantIds.add(participantId);
    });

    if (!participantIds.has(expense.paidBy)) {
      context.addIssue({
        code: "custom",
        message: "결제자는 정산 참여자에 포함되어야 합니다.",
        path: ["paidBy"],
      });
    }
  });

export const tripExpenseDocumentSchema = z
  .object({
    items: z.record(stableIdSchema, tripExpenseSchema),
  })
  .superRefine(({ items }, context) => {
    Object.entries(items).forEach(([expenseId, expense]) => {
      if (expense.id !== expenseId) {
        context.addIssue({
          code: "custom",
          message: `지출 항목 키 '${expenseId}'와 ID가 일치하지 않습니다.`,
          path: ["items", expenseId, "id"],
        });
      }
    });
  });

export type TripExpenseCategory = z.infer<typeof tripExpenseCategorySchema>;
export type TripExpense = z.infer<typeof tripExpenseSchema>;
export type TripExpenseDocument = z.infer<typeof tripExpenseDocumentSchema>;
export type TripExpenseChanges = Pick<
  TripExpense,
  "amount" | "category" | "paidBy" | "participantIds" | "title"
>;

export type TripExpenseMutationResult =
  | { data: TripExpenseDocument; success: true }
  | {
      code: "duplicate-expense" | "expense-not-found" | "invalid-expense";
      message: string;
      success: false;
    };

export type ExpenseBalance = {
  balance: number;
  owedAmount: number;
  paidAmount: number;
  userId: string;
};

export type ExpenseParticipantShare = {
  amount: number;
  userId: string;
};

export type ExpenseSettlementTransfer = {
  amount: number;
  fromUserId: string;
  toUserId: string;
};

export type TripExpenseSettlement = {
  balances: ExpenseBalance[];
  totalAmount: number;
  transfers: ExpenseSettlementTransfer[];
};

export const tripExpenseCategories: readonly TripExpenseCategory[] = [
  "food",
  "transport",
  "stay",
  "activity",
  "other",
];

export function createEmptyTripExpenseDocument(): TripExpenseDocument {
  return { items: {} };
}

export function addTripExpense(
  document: TripExpenseDocument,
  expense: TripExpense,
): TripExpenseMutationResult {
  const parsedExpense = tripExpenseSchema.safeParse(expense);

  if (!parsedExpense.success) {
    return {
      code: "invalid-expense",
      message: "지출 정보를 확인해 주세요.",
      success: false,
    };
  }

  if (document.items[parsedExpense.data.id]) {
    return {
      code: "duplicate-expense",
      message: "같은 지출 항목이 이미 있어요.",
      success: false,
    };
  }

  return {
    data: {
      items: {
        ...document.items,
        [parsedExpense.data.id]: parsedExpense.data,
      },
    },
    success: true,
  };
}

export function removeTripExpense(
  document: TripExpenseDocument,
  expenseId: string,
): TripExpenseMutationResult {
  if (!document.items[expenseId]) {
    return {
      code: "expense-not-found",
      message: "삭제할 지출 항목을 찾지 못했습니다.",
      success: false,
    };
  }

  const items = Object.fromEntries(
    Object.entries(document.items).filter(([currentExpenseId]) => currentExpenseId !== expenseId),
  );

  return { data: { items }, success: true };
}

export function updateTripExpense(
  document: TripExpenseDocument,
  {
    changes,
    expenseId,
  }: {
    changes: TripExpenseChanges;
    expenseId: string;
  },
): TripExpenseMutationResult {
  const currentExpense = document.items[expenseId];

  if (!currentExpense) {
    return {
      code: "expense-not-found",
      message: "수정할 지출 항목을 찾지 못했습니다.",
      success: false,
    };
  }

  const parsedExpense = tripExpenseSchema.safeParse({ ...currentExpense, ...changes });

  if (!parsedExpense.success) {
    return {
      code: "invalid-expense",
      message: "지출 정보를 확인해 주세요.",
      success: false,
    };
  }

  return {
    data: {
      items: {
        ...document.items,
        [expenseId]: parsedExpense.data,
      },
    },
    success: true,
  };
}

function createBalance(userId: string): ExpenseBalance {
  return { balance: 0, owedAmount: 0, paidAmount: 0, userId };
}

export function calculateTripExpenseParticipantShares(
  expense: TripExpense,
): ExpenseParticipantShare[] {
  const participantIds = expense.participantIds.toSorted();
  const baseShare = Math.floor(expense.amount / participantIds.length);
  const remainder = expense.amount % participantIds.length;

  return participantIds.map((userId, index) => ({
    amount: baseShare + (index < remainder ? 1 : 0),
    userId,
  }));
}

export function calculateTripExpenseSettlement(
  expenses: readonly TripExpense[],
  memberIds: readonly string[],
): TripExpenseSettlement {
  const balancesByUserId = new Map<string, ExpenseBalance>();

  memberIds.forEach((memberId) => {
    if (!balancesByUserId.has(memberId)) {
      balancesByUserId.set(memberId, createBalance(memberId));
    }
  });

  expenses.forEach((expense) => {
    const payer = balancesByUserId.get(expense.paidBy) ?? createBalance(expense.paidBy);
    payer.paidAmount += expense.amount;
    payer.balance += expense.amount;
    balancesByUserId.set(expense.paidBy, payer);

    calculateTripExpenseParticipantShares(expense).forEach(({ amount, userId }) => {
      const participant = balancesByUserId.get(userId) ?? createBalance(userId);
      participant.owedAmount += amount;
      participant.balance -= amount;
      balancesByUserId.set(userId, participant);
    });
  });

  const balances = [...balancesByUserId.values()].toSorted((left, right) =>
    left.userId.localeCompare(right.userId),
  );
  const creditors = balances
    .filter((balance) => balance.balance > 0)
    .map((balance) => ({ amount: balance.balance, userId: balance.userId }));
  const debtors = balances
    .filter((balance) => balance.balance < 0)
    .map((balance) => ({ amount: -balance.balance, userId: balance.userId }));
  const transfers: ExpenseSettlementTransfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    if (!creditor || !debtor) {
      break;
    }

    const amount = Math.min(creditor.amount, debtor.amount);
    transfers.push({ amount, fromUserId: debtor.userId, toUserId: creditor.userId });
    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) {
      creditorIndex += 1;
    }

    if (debtor.amount === 0) {
      debtorIndex += 1;
    }
  }

  return {
    balances,
    totalAmount: expenses.reduce((total, expense) => total + expense.amount, 0),
    transfers,
  };
}
