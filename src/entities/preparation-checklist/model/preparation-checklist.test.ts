import { describe, expect, it } from "vitest";

import {
  addPreparationChecklistItem,
  createEmptyPreparationChecklist,
  removePreparationChecklistItem,
  setPreparationChecklistItemAssignee,
  setPreparationChecklistItemCompletion,
} from "@/entities/preparation-checklist/model/preparation-checklist";

const checklistItem = {
  assigneeId: null,
  category: "booking" as const,
  completedAt: null,
  createdAt: "2026-04-01T09:00:00.000Z",
  createdBy: "user-jiwoo",
  id: "stay-reservation",
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
