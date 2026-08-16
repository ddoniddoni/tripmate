import { calendarDateSchema } from "@/shared/lib/calendar-date";
import { z } from "@/shared/lib/zod";

const stableIdSchema = z.string().trim().min(1).max(100);

export const preparationChecklistCategorySchema = z.enum([
  "booking",
  "transport",
  "packing",
  "other",
]);

export const preparationChecklistItemSchema = z.object({
  assigneeId: stableIdSchema.nullable(),
  category: preparationChecklistCategorySchema,
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  createdBy: stableIdSchema,
  dueDate: calendarDateSchema.nullable().default(null),
  id: stableIdSchema,
  isPriority: z.boolean().default(false),
  title: z.string().trim().min(1, "준비할 일을 입력해 주세요.").max(160),
});

export const preparationChecklistDocumentSchema = z
  .object({
    items: z.record(stableIdSchema, preparationChecklistItemSchema),
  })
  .superRefine(({ items }, context) => {
    Object.entries(items).forEach(([itemId, item]) => {
      if (item.id !== itemId) {
        context.addIssue({
          code: "custom",
          message: `준비 항목 키 '${itemId}'와 ID가 일치하지 않습니다.`,
          path: ["items", itemId, "id"],
        });
      }
    });
  });

export type PreparationChecklistCategory = z.infer<typeof preparationChecklistCategorySchema>;
export type PreparationChecklistItem = z.infer<typeof preparationChecklistItemSchema>;
export type PreparationChecklistDocument = z.infer<typeof preparationChecklistDocumentSchema>;
export type PreparationChecklistItemChanges = Pick<
  PreparationChecklistItem,
  "category" | "dueDate" | "title"
>;

export type PreparationChecklistMutationResult =
  | { data: PreparationChecklistDocument; success: true }
  | {
      code: "duplicate-item" | "invalid-item" | "item-not-found";
      message: string;
      success: false;
    };

export const preparationChecklistCategories: readonly PreparationChecklistCategory[] = [
  "booking",
  "transport",
  "packing",
  "other",
];

export function createEmptyPreparationChecklist(): PreparationChecklistDocument {
  return { items: {} };
}

export function addPreparationChecklistItem(
  document: PreparationChecklistDocument,
  item: PreparationChecklistItem,
): PreparationChecklistMutationResult {
  const parsedItem = preparationChecklistItemSchema.safeParse(item);

  if (!parsedItem.success) {
    return {
      code: "invalid-item",
      message: "준비 항목 정보를 확인해 주세요.",
      success: false,
    };
  }

  if (document.items[parsedItem.data.id]) {
    return {
      code: "duplicate-item",
      message: "같은 준비 항목이 이미 있어요.",
      success: false,
    };
  }

  return {
    data: {
      items: {
        ...document.items,
        [parsedItem.data.id]: parsedItem.data,
      },
    },
    success: true,
  };
}

export function setPreparationChecklistItemCompletion(
  document: PreparationChecklistDocument,
  itemId: string,
  completedAt: string | null,
): PreparationChecklistMutationResult {
  const item = document.items[itemId];

  if (!item) {
    return {
      code: "item-not-found",
      message: "변경할 준비 항목을 찾지 못했습니다.",
      success: false,
    };
  }

  return {
    data: {
      items: {
        ...document.items,
        [itemId]: { ...item, completedAt },
      },
    },
    success: true,
  };
}

export function setPreparationChecklistItemAssignee(
  document: PreparationChecklistDocument,
  itemId: string,
  assigneeId: string | null,
): PreparationChecklistMutationResult {
  const item = document.items[itemId];

  if (!item) {
    return {
      code: "item-not-found",
      message: "담당자를 변경할 준비 항목을 찾지 못했습니다.",
      success: false,
    };
  }

  return {
    data: {
      items: {
        ...document.items,
        [itemId]: { ...item, assigneeId },
      },
    },
    success: true,
  };
}

export function setPreparationChecklistItemPriority(
  document: PreparationChecklistDocument,
  itemId: string,
  isPriority: boolean,
): PreparationChecklistMutationResult {
  const item = document.items[itemId];

  if (!item) {
    return {
      code: "item-not-found",
      message: "변경할 준비 항목을 찾지 못했습니다.",
      success: false,
    };
  }

  return {
    data: {
      items: {
        ...document.items,
        [itemId]: { ...item, isPriority },
      },
    },
    success: true,
  };
}

export function updatePreparationChecklistItem(
  document: PreparationChecklistDocument,
  {
    changes,
    itemId,
  }: {
    changes: PreparationChecklistItemChanges;
    itemId: string;
  },
): PreparationChecklistMutationResult {
  const item = document.items[itemId];

  if (!item) {
    return {
      code: "item-not-found",
      message: "수정할 준비 항목을 찾지 못했습니다.",
      success: false,
    };
  }

  const nextItem = preparationChecklistItemSchema.safeParse({ ...item, ...changes });

  if (!nextItem.success) {
    return {
      code: "invalid-item",
      message: "준비 항목 정보를 확인해 주세요.",
      success: false,
    };
  }

  return {
    data: {
      items: {
        ...document.items,
        [itemId]: nextItem.data,
      },
    },
    success: true,
  };
}

export function removePreparationChecklistItem(
  document: PreparationChecklistDocument,
  itemId: string,
): PreparationChecklistMutationResult {
  if (!document.items[itemId]) {
    return {
      code: "item-not-found",
      message: "삭제할 준비 항목을 찾지 못했습니다.",
      success: false,
    };
  }

  const items = Object.fromEntries(
    Object.entries(document.items).filter(([currentItemId]) => currentItemId !== itemId),
  );

  return { data: { items }, success: true };
}
