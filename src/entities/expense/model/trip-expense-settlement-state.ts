import type { ExpenseSettlementTransfer } from "@/entities/expense/model/trip-expense";
import { z } from "@/shared/lib/zod";

const stableIdSchema = z.string().trim().min(1).max(100);
const transferKeySchema = z.string().min(1).max(300);

export const tripExpenseSettlementTransferCompletionSchema = z.object({
  completedAt: z.iso.datetime({ offset: true }),
  completedBy: stableIdSchema,
  revision: z.number().int().min(0),
  transferKey: transferKeySchema,
});

export const tripExpenseSettlementStateSchema = z
  .object({
    completedTransfers: z.record(transferKeySchema, tripExpenseSettlementTransferCompletionSchema),
    revision: z.number().int().min(0),
  })
  .superRefine((state, context) => {
    Object.entries(state.completedTransfers).forEach(([transferKey, completion]) => {
      if (completion.transferKey !== transferKey) {
        context.addIssue({
          code: "custom",
          message: "송금 완료 기록 키가 일치하지 않습니다.",
          path: ["completedTransfers", transferKey, "transferKey"],
        });
      }

      if (completion.revision !== state.revision) {
        context.addIssue({
          code: "custom",
          message: "현재 정산 안내와 다른 완료 기록입니다.",
          path: ["completedTransfers", transferKey, "revision"],
        });
      }
    });
  });

export type TripExpenseSettlementTransferCompletion = z.infer<
  typeof tripExpenseSettlementTransferCompletionSchema
>;
export type TripExpenseSettlementState = z.infer<typeof tripExpenseSettlementStateSchema>;

export function createEmptyTripExpenseSettlementState(): TripExpenseSettlementState {
  return { completedTransfers: {}, revision: 0 };
}

export function createTripExpenseSettlementTransferKey(
  transfer: ExpenseSettlementTransfer,
): string {
  return JSON.stringify([transfer.fromUserId, transfer.toUserId, transfer.amount]);
}

export function getTripExpenseSettlementTransferCompletion(
  state: TripExpenseSettlementState,
  transfer: ExpenseSettlementTransfer,
): TripExpenseSettlementTransferCompletion | null {
  const completion = state.completedTransfers[createTripExpenseSettlementTransferKey(transfer)];

  return completion?.revision === state.revision ? completion : null;
}

export function getTripExpenseSettlementProgress(
  transfers: readonly ExpenseSettlementTransfer[],
  state: TripExpenseSettlementState,
) {
  const completedTransferCount = transfers.filter(
    (transfer) => getTripExpenseSettlementTransferCompletion(state, transfer) !== null,
  ).length;

  return {
    allTransfersCompleted:
      transfers.length > 0 && completedTransferCount === transfers.length,
    completedTransferCount,
    totalTransferCount: transfers.length,
  };
}
