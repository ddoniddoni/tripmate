import { describe, expect, it } from "vitest";

import {
  addPreparationChecklistItem,
  createEmptyPreparationChecklist,
  preparationChecklistItemSchema,
  removePreparationChecklistItem,
  setPreparationChecklistItemAssignee,
  setPreparationChecklistItemCompletion,
  setPreparationChecklistItemPriority,
  updatePreparationChecklistItem,
} from "@/entities/preparation-checklist/model/preparation-checklist";

const checklistItem = {
  assigneeId: null,
  category: "booking" as const,
  completedAt: null,
  createdAt: "2026-04-01T09:00:00.000Z",
  createdBy: "user-jiwoo",
  dueDate: null,
  id: "stay-reservation",
  isPriority: false,
  title: "숙소 예약 확인하기",
};

describe("preparation checklist mutations", () => {
  it("adds an item and keeps its optional workflow fields explicit", () => {
    const result = addPreparationChecklistItem(createEmptyPreparationChecklist(), checklistItem);

    expect(result).toEqual({
      data: { items: { "stay-reservation": checklistItem } },
      success: true,
    });
  });

  it("updates completion and assignee without changing the task copy", () => {
    const added = addPreparationChecklistItem(createEmptyPreparationChecklist(), checklistItem);

    if (!added.success) {
      throw new Error("checklist item should be added");
    }

    const assigned = setPreparationChecklistItemAssignee(
      added.data,
      "stay-reservation",
      "user-minji",
    );

    if (!assigned.success) {
      throw new Error("checklist item should be assigned");
    }

    const completed = setPreparationChecklistItemCompletion(
      assigned.data,
      "stay-reservation",
      "2026-04-02T10:00:00.000Z",
    );

    expect(completed).toEqual({
      data: {
        items: {
          "stay-reservation": {
            ...checklistItem,
            assigneeId: "user-minji",
            completedAt: "2026-04-02T10:00:00.000Z",
          },
        },
      },
      success: true,
    });
  });

  it("updates the task copy while preserving its shared workflow state", () => {
    const added = addPreparationChecklistItem(createEmptyPreparationChecklist(), {
      ...checklistItem,
      assigneeId: "user-minji",
      completedAt: "2026-04-02T10:00:00.000Z",
      isPriority: true,
    });

    if (!added.success) {
      throw new Error("checklist item should be added");
    }

    const updated = updatePreparationChecklistItem(added.data, {
      changes: {
        category: "transport",
        dueDate: "2026-04-10",
        title: "공항버스 시간 확인하기",
      },
      itemId: "stay-reservation",
    });

    expect(updated).toEqual({
      data: {
        items: {
          "stay-reservation": {
            ...checklistItem,
            assigneeId: "user-minji",
            category: "transport",
            completedAt: "2026-04-02T10:00:00.000Z",
            dueDate: "2026-04-10",
            isPriority: true,
            title: "공항버스 시간 확인하기",
          },
        },
      },
      success: true,
    });
  });

  it("marks an item for priority review without changing its completion state", () => {
    const added = addPreparationChecklistItem(createEmptyPreparationChecklist(), checklistItem);

    if (!added.success) {
      throw new Error("checklist item should be added");
    }

    expect(setPreparationChecklistItemPriority(added.data, "stay-reservation", true)).toEqual({
      data: {
        items: {
          "stay-reservation": { ...checklistItem, isPriority: true },
        },
      },
      success: true,
    });
  });

  it("normalizes a legacy item without a due date to no due date", () => {
    const result = preparationChecklistItemSchema.safeParse({
      assigneeId: null,
      category: "packing",
      completedAt: null,
      createdAt: "2026-04-01T09:00:00.000Z",
      createdBy: "user-jiwoo",
      id: "passport",
      title: "여권 유효기간 확인하기",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.dueDate).toBeNull();
      expect(result.data.isPriority).toBe(false);
    }
  });

  it("removes an item and explains attempts to update a missing item", () => {
    const added = addPreparationChecklistItem(createEmptyPreparationChecklist(), checklistItem);

    if (!added.success) {
      throw new Error("checklist item should be added");
    }

    expect(removePreparationChecklistItem(added.data, "stay-reservation")).toEqual({
      data: { items: {} },
      success: true,
    });
    expect(setPreparationChecklistItemCompletion(added.data, "missing-item", null)).toMatchObject({
      code: "item-not-found",
      success: false,
    });
  });
});
