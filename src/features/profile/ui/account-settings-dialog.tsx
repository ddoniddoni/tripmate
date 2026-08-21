"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

import { DeleteAccountDialog } from "@/features/profile/ui/delete-account-dialog";
import { ProfileForm } from "@/features/profile/ui/profile-form";
import { DialogCloseIcon } from "@/shared/ui/dialog-close-icon";

type AccountSettingsDialogProps = {
  displayName: string;
  email: string | null;
};

export function AccountSettingsDialog({ displayName, email }: AccountSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const initial = Array.from(displayName)[0]?.toLocaleUpperCase("ko-KR") ?? "여";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          aria-label="계정 설정 열기"
          className="profile-avatar profile-account-trigger"
          title={`${displayName} 계정 설정`}
          type="button"
        >
          {initial}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby="account-settings-description"
          className="dialog-content account-settings-dialog"
        >
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">계정 설정</span>
              <Dialog.Title>내 프로필</Dialog.Title>
              <Dialog.Description className="dialog-description" id="account-settings-description">
                여행에서 표시되는 이름과 계정을 관리해요.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="대화상자 닫기" className="dialog-close">
              <DialogCloseIcon />
            </Dialog.Close>
          </div>

          <div className="account-settings-content">
            <section aria-label="로그인 계정" className="account-settings-summary">
              <span aria-hidden="true" className="account-settings-avatar">
                {initial}
              </span>
              <div>
                <strong>{displayName}</strong>
                <span>{email ?? "등록된 이메일 정보가 없어요."}</span>
              </div>
            </section>

            <section aria-labelledby="account-settings-profile-title" className="account-settings-profile">
              <div>
                <h3 id="account-settings-profile-title">닉네임</h3>
                <p>함께 여행하는 사람에게 이 이름으로 표시돼요.</p>
              </div>
              <ProfileForm
                initialDisplayName={displayName}
                nextPath="/trips"
                submitLabel="닉네임 저장"
                variant="account"
              />
            </section>

            <section aria-labelledby="account-settings-danger-title" className="account-settings-danger">
              <div>
                <span className="section-kicker">위험 구역</span>
                <h3 id="account-settings-danger-title">회원 탈퇴</h3>
                <p>탈퇴하면 계정으로 다시 로그인할 수 없어요.</p>
              </div>
              <DeleteAccountDialog />
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
