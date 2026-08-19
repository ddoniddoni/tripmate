"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useActionState, useState } from "react";

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
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [open, setOpen] = useState(false);

  if (!canDeleteTrip) {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setConfirmationTitle("");
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger className="trip-delete-trigger" type="button">
        <HeaderActionIcon name="delete" />
        여행 삭제
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
            <input name="confirmationTitle" type="hidden" value={confirmationTitle} />
            <input name="tripId" type="hidden" value={tripId} />

            <div className="form-field delete-trip-confirmation-field">
              <label htmlFor="delete-trip-confirmation">
                삭제하려면 여행 이름 <strong>{tripTitle}</strong>을 입력해 주세요.
              </label>
              <input
                aria-describedby={
                  confirmationTitle && confirmationTitle !== tripTitle
                    ? "delete-trip-confirmation-error"
                    : undefined
                }
                aria-invalid={Boolean(confirmationTitle && confirmationTitle !== tripTitle)}
                autoComplete="off"
                disabled={isPending}
                id="delete-trip-confirmation"
                onChange={(event) => setConfirmationTitle(event.target.value)}
                placeholder={tripTitle}
                type="text"
                value={confirmationTitle}
              />
              {confirmationTitle && confirmationTitle !== tripTitle ? (
                <span id="delete-trip-confirmation-error" role="alert">
                  여행 이름이 일치하지 않아요.
                </span>
              ) : null}
            </div>

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
              <button
                className="danger-button"
                type="submit"
                disabled={isPending || confirmationTitle !== tripTitle}
              >
                {isPending ? "삭제 중…" : "여행 삭제"}
              </button>
            </div>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
