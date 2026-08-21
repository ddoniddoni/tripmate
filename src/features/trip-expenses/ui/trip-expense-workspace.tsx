"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useStorage } from "@liveblocks/react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  addTripExpense,
  calculateTripExpenseParticipantShares,
  calculateTripExpenseSettlement,
  removeTripExpense,
  tripExpenseCategories,
  tripExpenseCategorySchema,
  updateTripExpense,
  type ExpenseSettlementTransfer,
  type ExpenseParticipantShare,
  type TripExpense,
  type TripExpenseCategory,
  type TripExpenseChanges,
} from "@/entities/expense/model/trip-expense";
import {
  createEmptyTripExpenseSettlementState,
  createTripExpenseSettlementTransferKey,
  getTripExpenseSettlementProgress,
  getTripExpenseSettlementTransferCompletion,
  type TripExpenseSettlementState,
} from "@/entities/expense/model/trip-expense-settlement-state";
import { getTripMemberLabels } from "@/entities/trip/lib/get-trip-member-labels";
import type { TripMember } from "@/entities/trip/model/trip-membership";
import {
  applyTripExpenseMutationToStorage,
  getLiveblocksTripExpenseSnapshot,
  getLiveblocksTripExpenseSettlementState,
  toggleTripExpenseSettlementTransferCompletionInStorage,
  type TripExpenseMutation,
  type TripExpenseSettlementCompletionInput,
} from "@/features/collaboration/model/liveblocks-trip-expenses";
import { z } from "@/shared/lib/zod";
import { NativeSelect } from "@/shared/ui/native-select";

const tripExpenseFormSchema = z
  .object({
    amount: z
      .number("금액을 입력해 주세요.")
      .int("금액은 원 단위 정수로 입력해 주세요.")
      .min(1, "금액은 1원 이상이어야 합니다.")
      .max(100_000_000, "한 번에 입력할 수 있는 금액은 1억 원까지입니다."),
    category: tripExpenseCategorySchema,
    paidBy: z.string().trim().min(1, "결제자를 선택해 주세요."),
    participantIds: z.array(z.string()).min(1, "참여자를 한 명 이상 선택해 주세요."),
    title: z.string().trim().min(1, "지출 내용을 입력해 주세요.").max(160),
  })
  .superRefine(({ paidBy, participantIds }, context) => {
    if (!participantIds.includes(paidBy)) {
      context.addIssue({
        code: "custom",
        message: "결제자는 정산 참여자에 포함되어야 합니다.",
        path: ["participantIds"],
      });
    }
  });

type TripExpenseFormValues = z.infer<typeof tripExpenseFormSchema>;
type TripExpenseMember = Pick<TripMember, "displayName" | "role" | "userId">;
type TripExpenseCategoryFilter = "all" | TripExpenseCategory;

type TripExpenseWorkspaceViewProps = {
  canEditExpenses: boolean;
  currentUserId: string;
  expenses: readonly TripExpense[];
  members: readonly TripExpenseMember[];
  onAdd: (values: TripExpenseFormValues) => boolean;
  onUpdate: (expenseId: string, values: TripExpenseFormValues) => boolean;
  onRemove: (expenseId: string) => void;
  onToggleTransferCompletion: (transfer: ExpenseSettlementTransfer) => void;
  settlementState: TripExpenseSettlementState;
  statusMessage: string;
};

const categoryCopy: Record<TripExpenseCategory, { icon: string; title: string }> = {
  activity: { icon: "✦", title: "관광·체험" },
  food: { icon: "◒", title: "식비" },
  other: { icon: "···", title: "기타" },
  stay: { icon: "⌂", title: "숙소" },
  transport: { icon: "↗", title: "교통" },
};

const expenseCategoryFilters: readonly TripExpenseCategoryFilter[] = [
  "all",
  ...tripExpenseCategories,
];

const koreanWeekdays = ["일", "월", "화", "수", "목", "금", "토"] as const;

const wonFormatter = new Intl.NumberFormat("ko-KR", {
  currency: "KRW",
  maximumFractionDigits: 0,
  style: "currency",
});

function formatWon(amount: number) {
  return wonFormatter.format(amount);
}

function getMemberName(userId: string, memberLabels: ReadonlyMap<string, string>) {
  return memberLabels.get(userId) ?? "여행 멤버";
}

function getExpenseCategoryFilterLabel(category: TripExpenseCategoryFilter) {
  return category === "all" ? "전체" : categoryCopy[category].title;
}

function getExpenseRecordDateKey(createdAt: string) {
  return createdAt.slice(0, 10);
}

function formatExpenseRecordDate(recordDate: string) {
  const [year, month, day] = recordDate.split("-").map(Number);
  const weekday = koreanWeekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

  return `기록일 · ${year}년 ${month}월 ${day}일 (${weekday})`;
}

function groupExpensesByRecordDate(expenses: readonly TripExpense[]) {
  const groups = new Map<string, TripExpense[]>();

  for (const expense of expenses) {
    const recordDate = getExpenseRecordDateKey(expense.createdAt);
    const group = groups.get(recordDate);

    if (group) {
      group.push(expense);
    } else {
      groups.set(recordDate, [expense]);
    }
  }

  return [...groups].map(([recordDate, groupedExpenses]) => ({
    expenses: groupedExpenses,
    recordDate,
  }));
}

function getPerPersonAmountLabel(participantShares: readonly ExpenseParticipantShare[]) {
  const amounts = participantShares.map((participantShare) => participantShare.amount);
  const lowestAmount = Math.min(...amounts);
  const highestAmount = Math.max(...amounts);

  if (lowestAmount === highestAmount) {
    return `1인당 ${formatWon(lowestAmount)}`;
  }

  return `1인당 ${formatWon(lowestAmount)}~${formatWon(highestAmount)}`;
}

function TripExpenseRow({
  canEditExpenses,
  expense,
  memberLabels,
  onEdit,
  onRemove,
}: {
  canEditExpenses: boolean;
  expense: TripExpense;
  memberLabels: ReadonlyMap<string, string>;
  onEdit: (expense: TripExpense) => void;
  onRemove: (expenseId: string) => void;
}) {
  const category = categoryCopy[expense.category];
  const payerName = getMemberName(expense.paidBy, memberLabels);
  const participantShares = calculateTripExpenseParticipantShares(expense);

  return (
    <li className="expense-row">
      <span aria-hidden="true" className={`expense-category-icon expense-category-${expense.category}`}>
        {category.icon}
      </span>
      <div className="expense-row-copy">
        <strong>{expense.title}</strong>
        <span>
          {category.title} · {payerName} 결제 · {expense.participantIds.length}명 정산
        </span>
      </div>
      <div className="expense-row-financials">
        <strong className="expense-row-amount">{formatWon(expense.amount)}</strong>
        <details className="expense-split-details">
          <summary aria-label={`${expense.title} 참여자별 N빵 보기`}>
            <span className="expense-split-summary">
              <span className="expense-split-summary-label">N빵 보기</span>
              <strong className="expense-split-summary-amount">
                {getPerPersonAmountLabel(participantShares)}
              </strong>
            </span>
            <svg
              aria-hidden="true"
              className="expense-split-toggle-icon"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </summary>
          <ul aria-label={`${expense.title} 참여자별 부담 금액`} className="expense-share-list">
            {participantShares.map((participantShare) => {
              const isPayer = participantShare.userId === expense.paidBy;

              return (
                <li key={participantShare.userId}>
                  <span>
                    {getMemberName(participantShare.userId, memberLabels)}
                    {isPayer ? <em>결제</em> : null}
                  </span>
                  <strong>{formatWon(participantShare.amount)}</strong>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
      {canEditExpenses ? (
        <div className="expense-row-actions">
          <button
            aria-label={`${expense.title} 지출 수정`}
            className="expense-edit-button"
            onClick={() => onEdit(expense)}
            type="button"
          >
            수정
          </button>
          <button
            aria-label={`${expense.title} 지출 삭제`}
            className="expense-remove-button"
            onClick={() => onRemove(expense.id)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}
    </li>
  );
}

function TripExpenseLedger({
  canEditExpenses,
  expenses,
  memberLabels,
  onEdit,
  onRemove,
}: {
  canEditExpenses: boolean;
  expenses: readonly TripExpense[];
  memberLabels: ReadonlyMap<string, string>;
  onEdit: (expense: TripExpense) => void;
  onRemove: (expenseId: string) => void;
}) {
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<TripExpenseCategoryFilter>("all");
  const orderedExpenses = expenses.toSorted((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  const filteredExpenses =
    expenseCategoryFilter === "all"
      ? orderedExpenses
      : orderedExpenses.filter((expense) => expense.category === expenseCategoryFilter);
  const expenseRecordGroups = groupExpensesByRecordDate(filteredExpenses);
  const expenseCategoryCounts = expenses.reduce<Record<TripExpenseCategory, number>>(
    (counts, expense) => {
      counts[expense.category] += 1;
      return counts;
    },
    { activity: 0, food: 0, other: 0, stay: 0, transport: 0 },
  );

  return (
    <section aria-labelledby="expense-list-heading" className="expense-ledger">
      <header>
        <div>
          <span className="section-kicker">지출 내역</span>
          <h3 id="expense-list-heading">함께 쓴 돈</h3>
        </div>
        <strong aria-label={`지출 ${filteredExpenses.length}건`}>{filteredExpenses.length}건</strong>
      </header>
      {orderedExpenses.length === 0 ? (
        <div className="expense-empty-state">
          <span aria-hidden="true">₩</span>
          <strong>아직 기록된 지출이 없어요.</strong>
          <p>첫 지출을 적으면 멤버별 정산 금액을 바로 계산해 드려요.</p>
        </div>
      ) : (
        <>
          <div aria-label="지출 카테고리 필터" className="expense-category-filters" role="group">
            {expenseCategoryFilters.map((category) => {
              const categoryExpenseCount =
                category === "all" ? expenses.length : expenseCategoryCounts[category];
              const isSelected = category === expenseCategoryFilter;

              return (
                <button
                  aria-label={`${getExpenseCategoryFilterLabel(category)}, ${categoryExpenseCount}건`}
                  aria-pressed={isSelected}
                  className={isSelected ? "expense-category-filter-active" : undefined}
                  key={category}
                  onClick={() => setExpenseCategoryFilter(category)}
                  type="button"
                >
                  <span>{getExpenseCategoryFilterLabel(category)}</span>
                  <small>{categoryExpenseCount}</small>
                </button>
              );
            })}
          </div>
          {filteredExpenses.length === 0 ? (
            <div className="expense-filter-empty-state" role="status">
              <strong>{getExpenseCategoryFilterLabel(expenseCategoryFilter)} 지출이 없어요.</strong>
              <p>다른 카테고리를 선택하거나 전체 지출을 확인해 보세요.</p>
              <button onClick={() => setExpenseCategoryFilter("all")} type="button">
                전체 지출 보기
              </button>
            </div>
          ) : (
            <div className="expense-ledger-body">
              <ol className="expense-record-groups">
                {expenseRecordGroups.map(({ expenses: recordExpenses, recordDate }) => (
                  <li className="expense-record-group" key={recordDate}>
                    <div className="expense-record-group-heading">
                      <h4>
                        <time dateTime={recordDate}>{formatExpenseRecordDate(recordDate)}</time>
                      </h4>
                      <span>{recordExpenses.length}건</span>
                    </div>
                    <ol className="expense-record-list">
                      {recordExpenses.map((expense) => (
                        <TripExpenseRow
                          canEditExpenses={canEditExpenses}
                          expense={expense}
                          key={expense.id}
                          memberLabels={memberLabels}
                          onEdit={onEdit}
                          onRemove={onRemove}
                        />
                      ))}
                    </ol>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function TripExpenseSettlementPanel({
  canEditExpenses,
  memberLabels,
  onToggleTransferCompletion,
  settlement,
  settlementState,
}: {
  canEditExpenses: boolean;
  memberLabels: ReadonlyMap<string, string>;
  onToggleTransferCompletion: (transfer: ExpenseSettlementTransfer) => void;
  settlement: ReturnType<typeof calculateTripExpenseSettlement>;
  settlementState: TripExpenseSettlementState;
}) {
  const progress = getTripExpenseSettlementProgress(settlement.transfers, settlementState);

  return (
    <aside aria-labelledby="settlement-heading" className="expense-settlement-panel">
      <div>
        <span className="section-kicker">정산 결과</span>
        <h3 id="settlement-heading">이렇게 보내면 끝나요.</h3>
        <p>각 지출을 참여 인원수로 균등하게 나눈 결과예요.</p>
      </div>
      {settlement.totalAmount === 0 ? (
        <p className="expense-settlement-empty">지출을 추가하면 정산 결과가 나타나요.</p>
      ) : (
        <>
          <ol className="expense-balance-list">
            {settlement.balances.map((balance) => {
              const label = getMemberName(balance.userId, memberLabels);
              const direction =
                balance.balance > 0 ? "받을 돈" : balance.balance < 0 ? "보낼 돈" : "정산 완료";

              return (
                <li key={balance.userId}>
                  <span>{label}</span>
                  <div>
                    <small>{direction}</small>
                    <strong className={balance.balance < 0 ? "expense-balance-negative" : undefined}>
                      {balance.balance === 0 ? "—" : formatWon(Math.abs(balance.balance))}
                    </strong>
                  </div>
                </li>
              );
            })}
          </ol>
          {settlement.transfers.length > 0 ? (
            <div className="expense-transfer-guidance">
              <div className="expense-transfer-guidance-heading">
                <h4>송금 안내</h4>
                <span aria-label={`정산 진행 ${progress.completedTransferCount}/${progress.totalTransferCount}건 완료`}>
                  {progress.completedTransferCount}/{progress.totalTransferCount}건 완료
                </span>
              </div>
              <ol className="expense-transfer-list">
                {settlement.transfers.map((transfer) => {
                  const completion = getTripExpenseSettlementTransferCompletion(settlementState, transfer);
                  const isCompleted = completion !== null;
                  const fromName = getMemberName(transfer.fromUserId, memberLabels);
                  const toName = getMemberName(transfer.toUserId, memberLabels);
                  const transferDescription = `${fromName}에서 ${toName}에게 ${formatWon(transfer.amount)} 송금`;

                  return (
                    <li
                      className={isCompleted ? "expense-transfer-complete" : undefined}
                      key={createTripExpenseSettlementTransferKey(transfer)}
                    >
                      <div className="expense-transfer-route">
                        <span>{fromName}</span>
                        <i aria-hidden="true">→</i>
                        <span>{toName}</span>
                        <strong>{formatWon(transfer.amount)}</strong>
                      </div>
                      <div className="expense-transfer-completion">
                        <small>
                          {completion
                            ? `완료 처리: ${getMemberName(completion.completedBy, memberLabels)}`
                            : "송금 대기"}
                        </small>
                        {canEditExpenses ? (
                          <button
                            aria-label={`${transferDescription} ${isCompleted ? "완료 취소" : "완료 처리"}`}
                            className="expense-transfer-completion-button"
                            onClick={() => onToggleTransferCompletion(transfer)}
                            type="button"
                          >
                            {isCompleted ? "완료 취소" : "보냈어요"}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <p className="expense-settlement-complete" role="status">
              현재 정산이 완료되었어요.
            </p>
          )}
          {progress.allTransfersCompleted ? (
            <p className="expense-settlement-finished" role="status">
              모든 송금이 완료됐어요.
            </p>
          ) : null}
        </>
      )}
    </aside>
  );
}

export function TripExpenseWorkspaceView({
  canEditExpenses,
  currentUserId,
  expenses,
  members,
  onAdd,
  onUpdate,
  onRemove,
  onToggleTransferCompletion,
  settlementState,
  statusMessage,
}: TripExpenseWorkspaceViewProps) {
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const hasExpenses = expenses.length > 0;
  const memberIds = members.map((member) => member.userId);
  const memberLabels = getTripMemberLabels(members, currentUserId);
  const settlement = calculateTripExpenseSettlement(expenses, memberIds);
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<TripExpenseFormValues>({
    defaultValues: {
      amount: undefined,
      category: "food",
      paidBy: currentUserId,
      participantIds: memberIds,
      title: "",
    },
    resolver: zodResolver(tripExpenseFormSchema),
  });
  const paidBy = useWatch({ control, name: "paidBy" });
  const participantIds = useWatch({ control, name: "participantIds" }) ?? [];
  const participantIdSet = new Set(participantIds);
  const paidByField = register("paidBy");

  const isEditingExpense = editingExpenseId !== null;

  function resetExpenseForm(values?: Partial<TripExpenseFormValues>) {
    reset(
      values ?? {
        amount: undefined,
        category: "food",
        paidBy: currentUserId,
        participantIds: memberIds,
        title: "",
      },
    );
  }

  function handleExpenseSubmit(values: TripExpenseFormValues) {
    if (editingExpenseId) {
      if (onUpdate(editingExpenseId, values)) {
        setEditingExpenseId(null);
        resetExpenseForm();
      }
      return;
    }

    if (onAdd(values)) {
      resetExpenseForm({ ...values, amount: undefined, title: "" });
    }
  }

  function handleEdit(expense: TripExpense) {
    setEditingExpenseId(expense.id);
    resetExpenseForm({
      amount: expense.amount,
      category: expense.category,
      paidBy: expense.paidBy,
      participantIds: expense.participantIds,
      title: expense.title,
    });
  }

  function handleEditCancel() {
    setEditingExpenseId(null);
    resetExpenseForm();
  }

  return (
    <section
      aria-label="경비"
      className={hasExpenses ? "expense-workspace" : "expense-workspace expense-workspace-empty"}
    >
      <header className="expense-briefing">
        <div>
          <span className="section-kicker">공동 경비</span>
          <h2>누가 썼는지, 깔끔하게 정산해요.</h2>
          <p>각 지출을 기록하면 결제와 참여 비율을 기준으로 보낼 돈을 계산해요.</p>
        </div>
        <div aria-label={`현재 총 지출 ${formatWon(settlement.totalAmount)}`} className="expense-total-card">
          <span>현재 총 지출</span>
          <strong>{formatWon(settlement.totalAmount)}</strong>
          <p>{expenses.length}건 기록됨</p>
        </div>
      </header>

      <div className={hasExpenses ? "expense-layout" : "expense-layout expense-layout-empty"}>
        <div className="expense-main-column">
          {canEditExpenses ? (
            <form className="expense-add-form" noValidate onSubmit={handleSubmit(handleExpenseSubmit)}>
              <div className="expense-add-heading">
                <span>{isEditingExpense ? "지출 수정" : "새 지출"}</span>
                <p>
                  {isEditingExpense
                    ? "저장하면 정산 안내와 완료 상태를 새로 계산합니다."
                    : "금액은 원화 기준으로 기록합니다."}
                </p>
              </div>
              <div className="expense-form-grid">
                <div className="expense-form-title-field">
                  <label htmlFor="expense-title">지출 내용</label>
                  <input
                    aria-describedby={errors.title ? "expense-title-error" : undefined}
                    aria-invalid={Boolean(errors.title)}
                    id="expense-title"
                    placeholder="예: 흑돼지 저녁"
                    {...register("title")}
                  />
                  {errors.title ? (
                    <span id="expense-title-error" role="alert">
                      {errors.title.message}
                    </span>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="expense-amount">금액</label>
                  <input
                    aria-describedby={errors.amount ? "expense-amount-error" : undefined}
                    aria-invalid={Boolean(errors.amount)}
                    id="expense-amount"
                    inputMode="numeric"
                    min="1"
                    placeholder="0"
                    type="number"
                    {...register("amount", { valueAsNumber: true })}
                  />
                  {errors.amount ? (
                    <span id="expense-amount-error" role="alert">
                      {errors.amount.message}
                    </span>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="expense-category">분류</label>
                  <NativeSelect id="expense-category" {...register("category")}>
                    {tripExpenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {categoryCopy[category].title}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label htmlFor="expense-payer">결제자</label>
                  <NativeSelect
                    id="expense-payer"
                    {...paidByField}
                    onChange={(event) => {
                      paidByField.onChange(event);

                      const nextPayerId = event.target.value;
                      const currentParticipantIds = getValues("participantIds");

                      if (!currentParticipantIds.includes(nextPayerId)) {
                        setValue(
                          "participantIds",
                          [...currentParticipantIds, nextPayerId],
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }
                    }}
                  >
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {memberLabels.get(member.userId) ?? "여행 멤버"}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <fieldset className="expense-participant-fieldset">
                <legend>정산 참여자</legend>
                <div>
                  {members.map((member) => {
                    const isPayer = member.userId === paidBy;
                    const isSelected = participantIdSet.has(member.userId);

                    return (
                      <label className="expense-participant-option" key={member.userId}>
                        <input
                          checked={isSelected}
                          disabled={isPayer}
                          onChange={(event) => {
                            const currentParticipantIds = getValues("participantIds");
                            const nextParticipantIds = event.currentTarget.checked
                              ? [...new Set([...currentParticipantIds, member.userId])]
                              : currentParticipantIds.filter(
                                  (participantId) => participantId !== member.userId,
                                );

                            setValue("participantIds", nextParticipantIds, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          type="checkbox"
                          value={member.userId}
                        />
                        <span>{memberLabels.get(member.userId) ?? "여행 멤버"}</span>
                        {isPayer ? <em>결제</em> : null}
                      </label>
                    );
                  })}
                </div>
                {errors.participantIds ? <p role="alert">{errors.participantIds.message}</p> : null}
              </fieldset>

              <div className="expense-form-actions">
                <button className="expense-add-button" type="submit">
                  {isEditingExpense ? "수정 저장" : "지출 기록하기"}
                </button>
                {isEditingExpense ? (
                  <button className="expense-edit-cancel-button" onClick={handleEditCancel} type="button">
                    취소
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="expense-read-only" role="status">
              보기 전용 권한에서는 경비를 변경할 수 없습니다.
            </p>
          )}

          <TripExpenseLedger
            canEditExpenses={canEditExpenses}
            expenses={expenses}
            memberLabels={memberLabels}
            onEdit={handleEdit}
            onRemove={onRemove}
          />
        </div>

        {hasExpenses ? (
          <TripExpenseSettlementPanel
            canEditExpenses={canEditExpenses}
            memberLabels={memberLabels}
            onToggleTransferCompletion={onToggleTransferCompletion}
            settlement={settlement}
            settlementState={settlementState}
          />
        ) : null}
      </div>

      <p aria-atomic="true" className="sr-only" role="status">
        {statusMessage}
      </p>
    </section>
  );
}

type TripExpenseWorkspaceProps = {
  canEditExpenses: boolean;
  currentUserId: string;
  members: readonly TripExpenseMember[];
};

export function TripExpenseWorkspace({
  canEditExpenses,
  currentUserId,
  members,
}: TripExpenseWorkspaceProps) {
  const expenseItems = useStorage((root) => root.expenseItems);
  const expenseSettlementCompletions = useStorage((root) => root.expenseSettlementCompletions);
  const expenseSettlementRevision = useStorage((root) => root.expenseSettlementRevision);
  const commitMutation = useMutation(
    ({ storage }, mutation) => applyTripExpenseMutationToStorage(storage, mutation),
    [],
  );
  const toggleTransferCompletion = useMutation(
    ({ storage }, input: TripExpenseSettlementCompletionInput) =>
      toggleTripExpenseSettlementTransferCompletionInStorage(storage, input),
    [],
  );
  const [statusMessage, setStatusMessage] = useState("공유 경비를 불러왔습니다.");
  const expenses = getLiveblocksTripExpenseSnapshot({ expenseItems });
  const settlementState =
    getLiveblocksTripExpenseSettlementState({
      expenseSettlementCompletions,
      expenseSettlementRevision,
    }) ?? createEmptyTripExpenseSettlementState();

  function ensureCanEditExpenses() {
    if (canEditExpenses) {
      return true;
    }

    setStatusMessage("보기 전용 권한에서는 경비를 변경할 수 없습니다.");
    return false;
  }

  function handleMutation(mutation: TripExpenseMutation, successMessage: string) {
    if (!ensureCanEditExpenses()) {
      return false;
    }

    const result = commitMutation(mutation);

    if (!result.success) {
      setStatusMessage(result.message);
      return false;
    }

    setStatusMessage(successMessage);
    return true;
  }

  return (
    <TripExpenseWorkspaceView
      canEditExpenses={canEditExpenses}
      currentUserId={currentUserId}
      expenses={expenses ? Object.values(expenses.items) : []}
      members={members}
      onAdd={(values) => {
        const expenseId = crypto.randomUUID();
        return handleMutation(
          (current) =>
            addTripExpense(current, {
              ...values,
              createdAt: new Date().toISOString(),
              createdBy: currentUserId,
              id: expenseId,
            }),
          `${values.title} 지출을 기록했습니다. 정산 완료 상태를 새로 계산했습니다.`,
        );
      }}
      onUpdate={(expenseId, values) => {
        const expense = expenses?.items[expenseId];
        const changes: TripExpenseChanges = values;

        return handleMutation(
          (current) =>
            updateTripExpense(current, {
              changes,
              expenseId,
            }),
          expense
            ? `${expense.title} 지출을 수정했습니다. 정산 완료 상태를 새로 계산했습니다.`
            : "지출을 수정했습니다. 정산 완료 상태를 새로 계산했습니다.",
        );
      }}
      onRemove={(expenseId) => {
        const expense = expenses?.items[expenseId];

        handleMutation(
          (current) => removeTripExpense(current, expenseId),
          expense
            ? `${expense.title} 지출을 삭제했습니다. 정산 완료 상태를 새로 계산했습니다.`
            : "지출을 삭제했습니다. 정산 완료 상태를 새로 계산했습니다.",
        );
      }}
      onToggleTransferCompletion={(transfer) => {
        if (!ensureCanEditExpenses()) {
          return;
        }

        const result = toggleTransferCompletion({
          completedAt: new Date().toISOString(),
          completedBy: currentUserId,
          revision: settlementState.revision,
          transfer,
        });

        if (!result.success) {
          setStatusMessage(result.message);
          return;
        }

        setStatusMessage(
          result.completed
            ? "송금을 완료로 표시했습니다."
            : "송금 완료 표시를 취소했습니다.",
        );
      }}
      settlementState={settlementState}
      statusMessage={statusMessage}
    />
  );
}
