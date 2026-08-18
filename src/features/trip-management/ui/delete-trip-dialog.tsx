"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useActionState } from "react";

import { deleteTrip } from "@/features/trip-management/model/delete-trip-action";
import { initialDeleteTripActionState } from "@/features/trip-management/model/delete-trip-action-state";
import { HeaderActionIcon } from "@/shared/ui/header-action-icon";

type DeleteTripDialogProps = {
  canDeleteTrip: boolean;
  tripId: string;
  tripTitle: string;
};

export function DeleteTripDialog({
  canDeleteTrip,
  tripId,
  tripTitle,
}: DeleteTripDialogProps) {
  const [state, formAction, isPending] = useActionState(deleteTrip, initialDeleteTripActionState);

  if (!canDeleteTrip) {
    return null;
  }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger className="trip-delete-trigger" type="button">
        <HeaderActionIcon name="delete" />
        이 여행 삭제
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content alert-dialog-content">
          <span className="section-kicker">되돌릴 수 없는 작업</span>
          <AlertDialog.Title>{tripTitle}을 삭제할까요?</AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            초대와 멤버 정보가 함께 삭제되고, 공유 일정에는 더 이상 접근할 수 없습니다. 이 작업은 되돌릴 수 없습니다.
          </AlertDialog.Description>

          <form action={formAction}>
            <input name="tripId" type="hidden" value={tripId} />

            {state.status === "error" ? (
              <p className="form-message form-message-error" role="alert">
                {state.message}
              </p>
            ) : null}

            <div className="dialog-actions">
              <AlertDialog.Cancel asChild>
                <button className="secondary-button" type="button" disabled={isPending}>
                  취소
                </button>
              </AlertDialog.Cancel>
              <button className="danger-button" type="submit" disabled={isPending}>
                {isPending ? "삭제 중…" : "여행 삭제"}
              </button>
            </div>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
