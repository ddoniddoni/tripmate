"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useActionState, useState } from "react";

import { deleteAccount } from "@/features/profile/model/delete-account-action";
import { initialDeleteAccountActionState } from "@/features/profile/model/delete-account-action-state";
import { HeaderActionIcon } from "@/shared/ui/header-action-icon";

const deletionConfirmation = "탈퇴";

export function DeleteAccountDialog() {
  const [state, formAction, isPending] = useActionState(
    deleteAccount,
    initialDeleteAccountActionState,
  );
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setConfirmation("");
    }
  }

  return (
    <AlertDialog.Root onOpenChange={handleOpenChange} open={open}>
      <AlertDialog.Trigger className="account-delete-trigger" type="button">
        <HeaderActionIcon name="delete" />
        회원 탈퇴
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content alert-dialog-content">
          <span className="section-kicker">되돌릴 수 없는 작업</span>
          <AlertDialog.Title>TripMate 계정을 탈퇴할까요?</AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            프로필과 내가 참여한 여행의 멤버 정보가 삭제됩니다. 다른 멤버가 있는 여행은 그대로 유지돼요.
            소유한 여행이 있다면 먼저 소유권을 넘기거나 여행을 삭제해야 합니다.
          </AlertDialog.Description>

          <form action={formAction}>
            <input name="confirmation" type="hidden" value={confirmation} />

            <div className="form-field delete-account-confirmation-field">
              <label htmlFor="delete-account-confirmation">
                계속하려면 <strong>{deletionConfirmation}</strong>를 입력해 주세요.
              </label>
              <input
                aria-describedby={
                  confirmation && confirmation !== deletionConfirmation
                    ? "delete-account-confirmation-error"
                    : undefined
                }
                aria-invalid={Boolean(confirmation && confirmation !== deletionConfirmation)}
                autoComplete="off"
                disabled={isPending}
                id="delete-account-confirmation"
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={deletionConfirmation}
                type="text"
                value={confirmation}
              />
              {confirmation && confirmation !== deletionConfirmation ? (
                <span id="delete-account-confirmation-error" role="alert">
                  입력한 내용이 일치하지 않아요.
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
                <button className="secondary-button" disabled={isPending} type="button">
                  취소
                </button>
              </AlertDialog.Cancel>
              <button
                className="danger-button"
                disabled={isPending || confirmation !== deletionConfirmation}
                type="submit"
              >
                {isPending ? "탈퇴 처리 중…" : "회원 탈퇴"}
              </button>
            </div>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
