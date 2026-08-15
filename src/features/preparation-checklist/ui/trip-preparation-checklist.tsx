"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useStorage } from "@liveblocks/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  addPreparationChecklistItem,
  preparationChecklistCategories,
  preparationChecklistCategorySchema,
  removePreparationChecklistItem,
  setPreparationChecklistItemAssignee,
  setPreparationChecklistItemCompletion,
  type PreparationChecklistCategory,
  type PreparationChecklistItem,
} from "@/entities/preparation-checklist/model/preparation-checklist";
import { getTripMemberLabels } from "@/entities/trip/lib/get-trip-member-labels";
import type { TripMember } from "@/entities/trip/model/trip-membership";
import {
  applyPreparationChecklistMutationToStorage,
  getLiveblocksPreparationChecklistSnapshot,
  type PreparationChecklistMutation,
} from "@/features/collaboration/model/liveblocks-preparation-checklist";
import { z } from "@/shared/lib/zod";

const preparationItemFormSchema = z.object({
  assigneeId: z.string(),
  category: preparationChecklistCategorySchema,
  title: z.string().trim().min(1, "준비할 일을 입력해 주세요.").max(160),
});

type PreparationItemFormValues = z.infer<typeof preparationItemFormSchema>;

type PreparationChecklistMember = Pick<TripMember, "displayName" | "role" | "userId">;

type TripPreparationChecklistViewProps = {
  canEditChecklist: boolean;
  currentUserId: string;
  items: readonly PreparationChecklistItem[];
  members: readonly PreparationChecklistMember[];
  onAdd: (values: PreparationItemFormValues) => boolean;
  onAssign: (itemId: string, assigneeId: string | null) => void;
  onRemove: (itemId: string) => void;
  onToggleComplete: (itemId: string) => void;
  statusMessage: string;
};

const categoryCopy: Record<
  PreparationChecklistCategory,
  { description: string; title: string }
> = {
  booking: { description: "숙소와 예약 확인", title: "예약" },
  other: { description: "여행 전 작은 할 일", title: "기타" },
  packing: { description: "가방에 넣을 물건", title: "짐 꾸리기" },
  transport: { description: "출발과 이동 준비", title: "이동" },
};

function getOrderedItems(items: readonly PreparationChecklistItem[]) {
  return items.toSorted((left, right) => {
    if (Boolean(left.completedAt) !== Boolean(right.completedAt)) {
      return left.completedAt ? 1 : -1;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function PreparationChecklistItemRow({
  canEditChecklist,
  item,
  memberLabels,
  members,
  onAssign,
  onRemove,
  onToggleComplete,
}: {
  canEditChecklist: boolean;
  item: PreparationChecklistItem;
  memberLabels: ReadonlyMap<string, string>;
  members: readonly PreparationChecklistMember[];
  onAssign: (itemId: string, assigneeId: string | null) => void;
  onRemove: (itemId: string) => void;
  onToggleComplete: (itemId: string) => void;
}) {
  const isComplete = item.completedAt !== null;

  return (
    <li className={`preparation-item${isComplete ? " preparation-item-complete" : ""}`}>
      <label className="preparation-item-check">
        <input
          aria-label={`${item.title} ${isComplete ? "완료 취소" : "완료"}`}
          checked={isComplete}
          disabled={!canEditChecklist}
          onChange={() => onToggleComplete(item.id)}
          type="checkbox"
        />
        <span aria-hidden="true" />
      </label>
      <div className="preparation-item-copy">
        <strong>{item.title}</strong>
        <span>{isComplete ? "완료했어요" : "준비 중"}</span>
      </div>
      <div className="preparation-item-actions">
        <label className="sr-only" htmlFor={`preparation-assignee-${item.id}`}>
          {item.title} 담당자
        </label>
        <select
          aria-label={`${item.title} 담당자`}
          disabled={!canEditChecklist}
          id={`preparation-assignee-${item.id}`}
          onChange={(event) => onAssign(item.id, event.target.value || null)}
          value={item.assigneeId ?? ""}
        >
          <option value="">담당자 없음</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {memberLabels.get(member.userId) ?? "여행 멤버"}
            </option>
          ))}
        </select>
        {canEditChecklist ? (
          <button
            aria-label={`${item.title} 삭제`}
            className="preparation-remove-button"
            onClick={() => onRemove(item.id)}
            type="button"
          >
            ×
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function TripPreparationChecklistView({
  canEditChecklist,
  currentUserId,
  items,
  members,
  onAdd,
  onAssign,
  onRemove,
  onToggleComplete,
  statusMessage,
}: TripPreparationChecklistViewProps) {
  const completedCount = items.filter((item) => item.completedAt !== null).length;
  const memberLabels = getTripMemberLabels(members, currentUserId);
  const progress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);
  const orderedItems = getOrderedItems(items);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<PreparationItemFormValues>({
    defaultValues: { assigneeId: "", category: "booking", title: "" },
    resolver: zodResolver(preparationItemFormSchema),
  });

  function handleAdd(values: PreparationItemFormValues) {
    if (onAdd(values)) {
      reset({ ...values, title: "" });
    }
  }

  return (
    <section aria-label="준비하기" className="preparation-workspace">
      <header className="preparation-briefing">
        <div>
          <span className="section-kicker">출발 전 브리핑</span>
          <h2 id="preparation-heading">떠나기 전에, 함께 챙겨요.</h2>
          <p>예약부터 가방까지. 누가 무엇을 맡았는지 한 화면에서 정리해요.</p>
        </div>
        <div aria-label={`준비 진행률 ${progress}%`} className="preparation-progress">
          <div className="preparation-progress-value">
            <strong>{progress}</strong>
            <span>%</span>
          </div>
          <div aria-hidden="true" className="preparation-progress-track">
            <i style={{ width: `${progress}%` }} />
          </div>
          <p>
            <strong>{completedCount}</strong> / {items.length}개 완료
          </p>
        </div>
      </header>

      {canEditChecklist ? (
        <form className="preparation-add-form" noValidate onSubmit={handleSubmit(handleAdd)}>
          <div className="preparation-title-field">
            <label className="sr-only" htmlFor="preparation-item-title">
              준비할 일
            </label>
            <input
              aria-describedby={errors.title ? "preparation-item-title-error" : undefined}
              aria-invalid={Boolean(errors.title)}
              id="preparation-item-title"
              placeholder="예: 숙소 예약 확인하기"
              {...register("title")}
            />
            {errors.title ? (
              <span id="preparation-item-title-error" role="alert">
                {errors.title.message}
              </span>
            ) : null}
          </div>
          <label className="sr-only" htmlFor="preparation-item-category">
            카테고리
          </label>
          <select id="preparation-item-category" {...register("category")}>
            {preparationChecklistCategories.map((category) => (
              <option key={category} value={category}>
                {categoryCopy[category].title}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="preparation-item-assignee">
            담당자
          </label>
          <select id="preparation-item-assignee" {...register("assigneeId")}>
            <option value="">담당자 없음</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {memberLabels.get(member.userId) ?? "여행 멤버"}
              </option>
            ))}
          </select>
          <button className="preparation-add-button" type="submit">
            <span aria-hidden="true">+</span>
            추가
          </button>
        </form>
      ) : (
        <p className="preparation-read-only" role="status">
          보기 전용 권한에서는 준비 항목을 변경할 수 없습니다.
        </p>
      )}

      <div className="preparation-board">
        {items.length === 0 ? (
          <div className="preparation-empty-state">
            <span aria-hidden="true">✦</span>
            <strong>첫 준비 항목을 적어 볼까요?</strong>
            <p>예약 확인, 교통편, 개인 짐처럼 출발 전에 챙길 일을 함께 나눠 보세요.</p>
          </div>
        ) : (
          preparationChecklistCategories.map((category) => {
            const categoryItems = orderedItems.filter((item) => item.category === category);

            if (categoryItems.length === 0) {
              return null;
            }

            const categoryCompletedCount = categoryItems.filter(
              (item) => item.completedAt !== null,
            ).length;

            return (
              <section className={`preparation-category preparation-category-${category}`} key={category}>
                <header>
                  <div>
                    <span>{categoryCopy[category].title}</span>
                    <p>{categoryCopy[category].description}</p>
                  </div>
                  <strong>
                    {categoryCompletedCount}/{categoryItems.length}
                  </strong>
                </header>
                <ol>
                  {categoryItems.map((item) => (
                    <PreparationChecklistItemRow
                      canEditChecklist={canEditChecklist}
                      item={item}
                      key={item.id}
                      memberLabels={memberLabels}
                      members={members}
                      onAssign={onAssign}
                      onRemove={onRemove}
                      onToggleComplete={onToggleComplete}
                    />
                  ))}
                </ol>
              </section>
            );
          })
        )}
      </div>

      <p aria-atomic="true" className="sr-only" role="status">
        {statusMessage}
      </p>
    </section>
  );
}

type TripPreparationChecklistProps = {
  canEditChecklist: boolean;
  currentUserId: string;
  members: readonly PreparationChecklistMember[];
};

export function TripPreparationChecklist({
  canEditChecklist,
  currentUserId,
  members,
}: TripPreparationChecklistProps) {
  const checklistItems = useStorage((root) => root.checklistItems);
  const commitMutation = useMutation(
    ({ storage }, mutation) => applyPreparationChecklistMutationToStorage(storage, mutation),
    [],
  );
  const [statusMessage, setStatusMessage] = useState("공유 준비 목록을 불러왔습니다.");
  const checklist = getLiveblocksPreparationChecklistSnapshot({ checklistItems });
  const items = checklist ? Object.values(checklist.items) : [];
  const memberLabels = getTripMemberLabels(members, currentUserId);

  function ensureCanEditChecklist() {
    if (canEditChecklist) {
      return true;
    }

    setStatusMessage("보기 전용 권한에서는 준비 항목을 변경할 수 없습니다.");
    return false;
  }

  function handleMutation(
    mutation: PreparationChecklistMutation,
    successMessage: string,
  ) {
    if (!ensureCanEditChecklist()) {
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
    <TripPreparationChecklistView
      canEditChecklist={canEditChecklist}
      currentUserId={currentUserId}
      items={items}
      members={members}
      onAdd={(values) => {
        const itemId = crypto.randomUUID();
        const result = handleMutation(
          (current) =>
            addPreparationChecklistItem(current, {
              assigneeId: values.assigneeId || null,
              category: values.category,
              completedAt: null,
              createdAt: new Date().toISOString(),
              createdBy: currentUserId,
              id: itemId,
              title: values.title,
            }),
          `${values.title} 준비 항목을 추가했습니다.`,
        );

        return result;
      }}
      onAssign={(itemId, assigneeId) => {
        const assignee = members.find((member) => member.userId === assigneeId);
        const assigneeName = assignee
          ? memberLabels.get(assignee.userId) ?? "여행 멤버"
          : "담당자 없음";

        handleMutation(
          (current) => setPreparationChecklistItemAssignee(current, itemId, assigneeId),
          `담당자를 ${assigneeName}(으)로 변경했습니다.`,
        );
      }}
      onRemove={(itemId) => {
        const item = checklist?.items[itemId];

        handleMutation(
          (current) => removePreparationChecklistItem(current, itemId),
          item ? `${item.title} 준비 항목을 삭제했습니다.` : "준비 항목을 삭제했습니다.",
        );
      }}
      onToggleComplete={(itemId) => {
        const item = checklist?.items[itemId];
        const completedAt = item?.completedAt ? null : new Date().toISOString();

        handleMutation(
          (current) => setPreparationChecklistItemCompletion(current, itemId, completedAt),
          item?.completedAt
            ? `${item.title} 준비 항목을 다시 진행 중으로 바꿨어요.`
            : `${item?.title ?? "준비 항목"}을 완료했어요.`,
        );
      }}
      statusMessage={statusMessage}
    />
  );
}
