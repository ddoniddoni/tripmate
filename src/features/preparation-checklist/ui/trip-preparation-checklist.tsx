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
  setPreparationChecklistItemPriority,
  updatePreparationChecklistItem,
  type PreparationChecklistCategory,
  type PreparationChecklistItemChanges,
  type PreparationChecklistItem,
} from "@/entities/preparation-checklist/model/preparation-checklist";
import { getTripMemberLabels } from "@/entities/trip/lib/get-trip-member-labels";
import type { TripMember } from "@/entities/trip/model/trip-membership";
import {
  applyPreparationChecklistMutationToStorage,
  getLiveblocksPreparationChecklistSnapshot,
  type PreparationChecklistMutation,
} from "@/features/collaboration/model/liveblocks-preparation-checklist";
import { calendarDateSchema, formatCalendarDate } from "@/shared/lib/calendar-date";
import { NativeSelect } from "@/shared/ui/native-select";
import { z } from "@/shared/lib/zod";

const optionalCalendarDateFormSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || calendarDateSchema.safeParse(value).success,
    "마감일을 다시 확인해 주세요.",
  );

const preparationItemFormSchema = z.object({
  assigneeId: z.string(),
  category: preparationChecklistCategorySchema,
  dueDate: optionalCalendarDateFormSchema,
  title: z.string().trim().min(1, "준비할 일을 입력해 주세요.").max(160),
});

type PreparationItemFormValues = z.infer<typeof preparationItemFormSchema>;
type PreparationItemEditFormValues = Pick<
  PreparationItemFormValues,
  "category" | "dueDate" | "title"
>;

type PreparationChecklistMember = Pick<TripMember, "displayName" | "role" | "userId">;
type PreparationChecklistFilter = "all" | "complete" | "incomplete" | "mine" | "priority";

type TripPreparationChecklistViewProps = {
  canEditChecklist: boolean;
  currentUserId: string;
  items: readonly PreparationChecklistItem[];
  members: readonly PreparationChecklistMember[];
  onAdd: (values: PreparationItemFormValues) => boolean;
  onAssign: (itemId: string, assigneeId: string | null) => void;
  onUpdate: (itemId: string, changes: PreparationChecklistItemChanges) => boolean;
  onRemove: (itemId: string) => void;
  onToggleComplete: (itemId: string) => void;
  onTogglePriority: (itemId: string) => void;
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

const preparationChecklistFilters: readonly PreparationChecklistFilter[] = [
  "all",
  "incomplete",
  "mine",
  "priority",
  "complete",
];

function getPreparationChecklistFilterLabel(filter: PreparationChecklistFilter) {
  switch (filter) {
    case "all":
      return "전체";
    case "incomplete":
      return "미완료";
    case "mine":
      return "내 담당";
    case "priority":
      return "우선";
    case "complete":
      return "완료";
  }
}

function getPreparationChecklistFilterCounts(
  items: readonly PreparationChecklistItem[],
  currentUserId: string,
) {
  const counts: Record<PreparationChecklistFilter, number> = {
    all: items.length,
    complete: 0,
    incomplete: 0,
    mine: 0,
    priority: 0,
  };

  for (const item of items) {
    if (item.completedAt) {
      counts.complete += 1;
    } else {
      counts.incomplete += 1;
    }

    if (item.assigneeId === currentUserId) {
      counts.mine += 1;
    }

    if (item.isPriority) {
      counts.priority += 1;
    }
  }

  return counts;
}

function getOrderedItems(items: readonly PreparationChecklistItem[]) {
  return items.toSorted((left, right) => {
    if (Boolean(left.completedAt) !== Boolean(right.completedAt)) {
      return left.completedAt ? 1 : -1;
    }

    if (left.isPriority !== right.isPriority) {
      return left.isPriority ? -1 : 1;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function PreparationChecklistItemRow({
  canEditChecklist,
  isEditing,
  item,
  memberLabels,
  members,
  onAssign,
  onEdit,
  onEditCancel,
  onRemove,
  onToggleComplete,
  onTogglePriority,
  onUpdate,
}: {
  canEditChecklist: boolean;
  isEditing: boolean;
  item: PreparationChecklistItem;
  memberLabels: ReadonlyMap<string, string>;
  members: readonly PreparationChecklistMember[];
  onAssign: (itemId: string, assigneeId: string | null) => void;
  onEdit: (itemId: string) => void;
  onEditCancel: () => void;
  onRemove: (itemId: string) => void;
  onToggleComplete: (itemId: string) => void;
  onTogglePriority: (itemId: string) => void;
  onUpdate: (itemId: string, changes: PreparationChecklistItemChanges) => boolean;
}) {
  const isComplete = item.completedAt !== null;

  return (
    <li
      className={`preparation-item${isComplete ? " preparation-item-complete" : ""}${
        item.isPriority ? " preparation-item-priority" : ""
      }${isEditing ? " preparation-item-editing" : ""}`}
    >
      {isEditing ? (
        <PreparationChecklistItemEditForm
          item={item}
          onCancel={onEditCancel}
          onUpdate={(values) => onUpdate(item.id, values)}
        />
      ) : (
        <>
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
            <div className="preparation-item-meta">
              {item.isPriority ? (
                <span className="preparation-item-priority-badge">우선</span>
              ) : null}
              <span>{isComplete ? "완료했어요" : "준비 중"}</span>
              {item.dueDate ? (
                <time className="preparation-item-due-date" dateTime={item.dueDate}>
                  마감 {formatCalendarDate(item.dueDate, { day: "numeric", month: "long" })}
                </time>
              ) : null}
            </div>
          </div>
          <div className="preparation-item-actions">
            <label className="sr-only" htmlFor={`preparation-assignee-${item.id}`}>
              {item.title} 담당자
            </label>
            <NativeSelect
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
            </NativeSelect>
            {canEditChecklist ? (
              <>
                <button
                  aria-label={`${item.title} ${item.isPriority ? "우선 해제" : "우선 표시"}`}
                  aria-pressed={item.isPriority}
                  className={
                    item.isPriority
                      ? "preparation-priority-button preparation-priority-button-active"
                      : "preparation-priority-button"
                  }
                  onClick={() => onTogglePriority(item.id)}
                  type="button"
                >
                  우선
                </button>
                <button
                  aria-label={`${item.title} 수정`}
                  className="preparation-edit-button"
                  onClick={() => onEdit(item.id)}
                  type="button"
                >
                  수정
                </button>
                <button
                  aria-label={`${item.title} 삭제`}
                  className="preparation-remove-button"
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  ×
                </button>
              </>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}

function PreparationChecklistItemEditForm({
  item,
  onCancel,
  onUpdate,
}: {
  item: PreparationChecklistItem;
  onCancel: () => void;
  onUpdate: (changes: PreparationChecklistItemChanges) => boolean;
}) {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<PreparationItemEditFormValues>({
    defaultValues: { category: item.category, dueDate: item.dueDate ?? "", title: item.title },
    resolver: zodResolver(preparationItemFormSchema.pick({ category: true, dueDate: true, title: true })),
  });

  function handleUpdate(values: PreparationItemEditFormValues) {
    if (onUpdate({ ...values, dueDate: values.dueDate || null })) {
      onCancel();
    }
  }

  return (
    <form
      aria-label={`${item.title} 수정`}
      className="preparation-item-edit-form"
      noValidate
      onSubmit={handleSubmit(handleUpdate)}
    >
      <div className="preparation-item-edit-title-field">
        <label className="sr-only" htmlFor={`preparation-edit-title-${item.id}`}>
          준비할 일 수정
        </label>
        <input
          aria-describedby={errors.title ? `preparation-edit-title-error-${item.id}` : undefined}
          aria-invalid={Boolean(errors.title)}
          id={`preparation-edit-title-${item.id}`}
          {...register("title")}
        />
        {errors.title ? (
          <span id={`preparation-edit-title-error-${item.id}`} role="alert">
            {errors.title.message}
          </span>
        ) : null}
      </div>
      <div>
        <label className="sr-only" htmlFor={`preparation-edit-category-${item.id}`}>
          준비 항목 분류 수정
        </label>
        <NativeSelect id={`preparation-edit-category-${item.id}`} {...register("category")}>
          {preparationChecklistCategories.map((category) => (
            <option key={category} value={category}>
              {categoryCopy[category].title}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="preparation-item-edit-date-field">
        <label className="sr-only" htmlFor={`preparation-edit-due-date-${item.id}`}>
          마감일 수정
        </label>
        <input
          aria-describedby={
            errors.dueDate ? `preparation-edit-due-date-error-${item.id}` : undefined
          }
          aria-invalid={Boolean(errors.dueDate)}
          id={`preparation-edit-due-date-${item.id}`}
          type="date"
          {...register("dueDate")}
        />
        {errors.dueDate ? (
          <span id={`preparation-edit-due-date-error-${item.id}`} role="alert">
            {errors.dueDate.message}
          </span>
        ) : null}
      </div>
      <div className="preparation-item-edit-actions">
        <button className="preparation-item-save-button" type="submit">
          저장
        </button>
        <button className="preparation-item-cancel-button" onClick={onCancel} type="button">
          취소
        </button>
      </div>
    </form>
  );
}

function TripPreparationChecklistBoard({
  canEditChecklist,
  currentUserId,
  items,
  memberLabels,
  members,
  onAssign,
  onUpdate,
  onRemove,
  onToggleComplete,
  onTogglePriority,
}: {
  canEditChecklist: boolean;
  currentUserId: string;
  items: readonly PreparationChecklistItem[];
  memberLabels: ReadonlyMap<string, string>;
  members: readonly PreparationChecklistMember[];
  onAssign: (itemId: string, assigneeId: string | null) => void;
  onUpdate: (itemId: string, changes: PreparationChecklistItemChanges) => boolean;
  onRemove: (itemId: string) => void;
  onToggleComplete: (itemId: string) => void;
  onTogglePriority: (itemId: string) => void;
}) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PreparationChecklistFilter>("all");
  const orderedItems = getOrderedItems(items);
  const filterCounts = getPreparationChecklistFilterCounts(items, currentUserId);
  const filteredItems = orderedItems.filter((item) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "complete") {
      return item.completedAt !== null;
    }

    if (filter === "incomplete") {
      return item.completedAt === null;
    }

    if (filter === "priority") {
      return item.isPriority;
    }

    return item.assigneeId === currentUserId;
  });

  return (
    <div className="preparation-listing">
      {items.length > 0 ? (
        <div aria-label="준비 항목 필터" className="preparation-checklist-filters" role="group">
          {preparationChecklistFilters.map((currentFilter) => {
            const isSelected = currentFilter === filter;
            const count = filterCounts[currentFilter];

            return (
              <button
                aria-label={`${getPreparationChecklistFilterLabel(currentFilter)}, ${count}개`}
                aria-pressed={isSelected}
                className={isSelected ? "preparation-checklist-filter-active" : undefined}
                key={currentFilter}
                onClick={() => {
                  setEditingItemId(null);
                  setFilter(currentFilter);
                }}
                type="button"
              >
                <span>{getPreparationChecklistFilterLabel(currentFilter)}</span>
                <small>{count}</small>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="preparation-board">
        {items.length === 0 ? (
          <div className="preparation-empty-state">
            <span aria-hidden="true">✦</span>
            <strong>첫 준비 항목을 적어 볼까요?</strong>
            <p>예약 확인, 교통편, 개인 짐처럼 출발 전에 챙길 일을 함께 나눠 보세요.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="preparation-filter-empty-state" role="status">
            <strong>{getPreparationChecklistFilterLabel(filter)} 항목이 없어요.</strong>
            <p>다른 필터를 선택하거나 전체 준비 항목을 확인해 보세요.</p>
            <button onClick={() => setFilter("all")} type="button">
              전체 항목 보기
            </button>
          </div>
        ) : (
          preparationChecklistCategories.map((category) => {
            const categoryItems = filteredItems.filter((item) => item.category === category);

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
                      isEditing={editingItemId === item.id}
                      item={item}
                      key={item.id}
                      memberLabels={memberLabels}
                      members={members}
                      onAssign={onAssign}
                      onEdit={setEditingItemId}
                      onEditCancel={() => setEditingItemId(null)}
                      onRemove={onRemove}
                      onToggleComplete={onToggleComplete}
                      onTogglePriority={onTogglePriority}
                      onUpdate={onUpdate}
                    />
                  ))}
                </ol>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

export function TripPreparationChecklistView({
  canEditChecklist,
  currentUserId,
  items,
  members,
  onAdd,
  onAssign,
  onUpdate,
  onRemove,
  onToggleComplete,
  onTogglePriority,
  statusMessage,
}: TripPreparationChecklistViewProps) {
  const hasItems = items.length > 0;
  const completedCount = items.filter((item) => item.completedAt !== null).length;
  const memberLabels = getTripMemberLabels(members, currentUserId);
  const progress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<PreparationItemFormValues>({
    defaultValues: { assigneeId: "", category: "booking", dueDate: "", title: "" },
    resolver: zodResolver(preparationItemFormSchema),
  });

  function handleAdd(values: PreparationItemFormValues) {
    if (onAdd(values)) {
      reset({ ...values, title: "" });
    }
  }

  return (
    <section
      aria-label="준비하기"
      className={hasItems ? "preparation-workspace" : "preparation-workspace preparation-workspace-empty"}
    >
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
          <NativeSelect
            containerClassName="preparation-select-field"
            id="preparation-item-category"
            {...register("category")}
          >
            {preparationChecklistCategories.map((category) => (
              <option key={category} value={category}>
                {categoryCopy[category].title}
              </option>
            ))}
          </NativeSelect>
          <div className="preparation-due-date-field">
            <label className="sr-only" htmlFor="preparation-item-due-date">
              마감일
            </label>
            <input
              aria-describedby={errors.dueDate ? "preparation-item-due-date-error" : undefined}
              aria-invalid={Boolean(errors.dueDate)}
              id="preparation-item-due-date"
              type="date"
              {...register("dueDate")}
            />
            {errors.dueDate ? (
              <span id="preparation-item-due-date-error" role="alert">
                {errors.dueDate.message}
              </span>
            ) : null}
          </div>
          <label className="sr-only" htmlFor="preparation-item-assignee">
            담당자
          </label>
          <NativeSelect
            containerClassName="preparation-select-field"
            id="preparation-item-assignee"
            {...register("assigneeId")}
          >
            <option value="">담당자 없음</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {memberLabels.get(member.userId) ?? "여행 멤버"}
              </option>
            ))}
          </NativeSelect>
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

      <TripPreparationChecklistBoard
        canEditChecklist={canEditChecklist}
        currentUserId={currentUserId}
        items={items}
        memberLabels={memberLabels}
        members={members}
        onAssign={onAssign}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onToggleComplete={onToggleComplete}
        onTogglePriority={onTogglePriority}
      />

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
              dueDate: values.dueDate || null,
              id: itemId,
              isPriority: false,
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
      onUpdate={(itemId, values) => {
        const item = checklist?.items[itemId];

        return handleMutation(
          (current) => updatePreparationChecklistItem(current, { changes: values, itemId }),
          item ? `${item.title} 준비 항목을 수정했습니다.` : "준비 항목을 수정했습니다.",
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
      onTogglePriority={(itemId) => {
        const item = checklist?.items[itemId];
        const isPriority = !item?.isPriority;

        handleMutation(
          (current) => setPreparationChecklistItemPriority(current, itemId, isPriority),
          isPriority
            ? `${item?.title ?? "준비 항목"}을 우선 확인 항목으로 표시했습니다.`
            : `${item?.title ?? "준비 항목"}을 일반 준비 항목으로 돌렸습니다.`,
        );
      }}
      statusMessage={statusMessage}
    />
  );
}
