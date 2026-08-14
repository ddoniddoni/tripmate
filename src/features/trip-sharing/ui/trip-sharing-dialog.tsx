"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  createTripInvitationSchema,
  type CreateTripInvitationInput,
  type TripInvitation,
} from "@/entities/trip/model/trip-invitation";
import { createTripInvitation } from "@/features/trip-sharing/model/trip-invitation-actions";
import { initialCreateTripInvitationActionState } from "@/features/trip-sharing/model/trip-invitation-action-state";
import { PendingTripInvitations } from "@/features/trip-sharing/ui/pending-trip-invitations";

type TripSharingDialogProps = {
  canManageMembers: boolean;
  invitations: TripInvitation[];
  memberCount: number;
  tripId: string;
};

type TripInvitationFormValues = Omit<CreateTripInvitationInput, "tripId">;

const defaultValues: TripInvitationFormValues = {
  email: "",
  role: "editor",
};

function toFormData(values: TripInvitationFormValues, tripId: string) {
  const formData = new FormData();

  formData.set("email", values.email);
  formData.set("role", values.role);
  formData.set("tripId", tripId);

  return formData;
}

export function TripSharingDialog({
  canManageMembers,
  invitations,
  memberCount,
  tripId,
}: TripSharingDialogProps) {
  const router = useRouter();
  const [copyMessage, setCopyMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createTripInvitation,
    initialCreateTripInvitationActionState,
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<TripInvitationFormValues>({
    defaultValues,
    resolver: zodResolver(createTripInvitationSchema.omit({ tripId: true })),
  });

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.invitationUrl, state.status]);

  if (!canManageMembers) {
    return <span className="share-placeholder">멤버 {memberCount}명</span>;
  }

  function handleInvite(values: TripInvitationFormValues) {
    setCopyMessage("");
    startTransition(() => {
      formAction(toFormData(values, tripId));
    });
  }

  async function handleCopyInvitationLink() {
    if (!state.invitationUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.invitationUrl);
      setCopyMessage("링크를 복사했어요.");
    } catch {
      setCopyMessage("링크를 직접 복사해 보내 주세요.");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="share-placeholder share-button" type="button">
        멤버 {memberCount}명 · 초대
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="trip-sharing-description">
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">여행 멤버</span>
              <Dialog.Title>함께 여행을 계획해요</Dialog.Title>
              <Dialog.Description className="dialog-description" id="trip-sharing-description">
                초대받은 이메일의 실제 계정만 링크를 수락할 수 있어요.
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="대화상자 닫기" disabled={isPending}>
              ×
            </Dialog.Close>
          </div>

          <form className="itinerary-form" noValidate onSubmit={handleSubmit(handleInvite)}>
            <div className="form-field form-field-wide">
              <label htmlFor="invite-email">초대할 이메일</label>
              <input
                id="invite-email"
                aria-describedby={errors.email ? "invite-email-error" : undefined}
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
                disabled={isPending}
                inputMode="email"
                placeholder="friend@example.com"
                type="email"
                {...register("email")}
              />
              {errors.email ? (
                <span id="invite-email-error" role="alert">
                  {errors.email.message}
                </span>
              ) : null}
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="invite-role">권한</label>
              <select
                id="invite-role"
                aria-describedby={errors.role ? "invite-role-error" : undefined}
                aria-invalid={Boolean(errors.role)}
                disabled={isPending}
                {...register("role")}
              >
                <option value="editor">편집자 · 일정 편집 가능</option>
                <option value="viewer">보기 전용 · 일정 확인만 가능</option>
              </select>
              {errors.role ? (
                <span id="invite-role-error" role="alert">
                  {errors.role.message}
                </span>
              ) : null}
            </div>

            {state.status !== "idle" ? (
              <p
                className={`form-message form-message-${state.status}`}
                role={state.status === "error" ? "alert" : "status"}
              >
                {state.message}
              </p>
            ) : null}

            {state.invitationUrl ? (
              <div className="form-field form-field-wide invitation-link-field">
                <label htmlFor="invitation-link">초대 링크</label>
                <input id="invitation-link" readOnly value={state.invitationUrl} />
                <button className="secondary-button" type="button" onClick={handleCopyInvitationLink}>
                  링크 복사
                </button>
                {copyMessage ? <span role="status">{copyMessage}</span> : null}
              </div>
            ) : null}

            <PendingTripInvitations invitations={invitations} tripId={tripId} />

            <div className="dialog-actions form-field-wide">
              <Dialog.Close className="secondary-button" type="button" disabled={isPending}>
                닫기
              </Dialog.Close>
              <button className="primary-button" type="submit" disabled={isPending}>
                {isPending ? "링크 만드는 중…" : "초대 링크 만들기"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
