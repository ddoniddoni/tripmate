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
import type { TripMember } from "@/entities/trip/model/trip-membership";
import { createTripInvitation } from "@/features/trip-sharing/model/trip-invitation-actions";
import { initialCreateTripInvitationActionState } from "@/features/trip-sharing/model/trip-invitation-action-state";
import { PendingTripInvitations } from "@/features/trip-sharing/ui/pending-trip-invitations";
import { TripMembers } from "@/features/trip-sharing/ui/trip-members";
import { DialogCloseIcon } from "@/shared/ui/dialog-close-icon";
import { HeaderActionIcon } from "@/shared/ui/header-action-icon";
import { NativeSelect } from "@/shared/ui/native-select";

type TripSharingDialogProps = {
  canManageMembers: boolean;
  currentUserId: string;
  invitations: TripInvitation[];
  memberCount: number;
  members: readonly TripMember[];
  tripId: string;
  triggerLabel?: string;
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
  currentUserId,
  invitations,
  memberCount,
  members,
  tripId,
  triggerLabel,
}: TripSharingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createTripInvitation,
    initialCreateTripInvitationActionState,
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<TripInvitationFormValues>({
    defaultValues,
    resolver: zodResolver(createTripInvitationSchema.omit({ tripId: true })),
  });

  useEffect(() => {
    if (state.status === "success") {
      reset(defaultValues);
      router.refresh();
    }
  }, [reset, router, state.status]);

  function handleInvite(values: TripInvitationFormValues) {
    startTransition(() => {
      formAction(toFormData(values, tripId));
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="share-placeholder share-button" type="button">
        <HeaderActionIcon name="share" />
        {triggerLabel ?? `멤버 ${memberCount}명${canManageMembers ? " · 초대" : ""}`}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content trip-sharing-dialog-content"
          aria-describedby="trip-sharing-description"
        >
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">여행 멤버</span>
              <Dialog.Title>함께 여행을 계획해요</Dialog.Title>
              <Dialog.Description className="dialog-description" id="trip-sharing-description">
                {canManageMembers
                  ? "등록된 TripMate 계정으로 초대를 보내면 상대방 알림에 바로 도착해요."
                  : "함께 여행하는 멤버와 내 참여 상태를 확인할 수 있어요."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="dialog-close" aria-label="대화상자 닫기" disabled={isPending}>
              <DialogCloseIcon />
            </Dialog.Close>
          </div>

          {canManageMembers ? (
            <form className="itinerary-form" noValidate onSubmit={handleSubmit(handleInvite)}>
              <div className="form-field trip-sharing-email-field">
                <label htmlFor="invite-email">가입된 계정 이메일</label>
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

              <div className="form-field trip-sharing-role-field">
                <label htmlFor="invite-role">권한</label>
                <NativeSelect
                  containerClassName="trip-sharing-role-select"
                  id="invite-role"
                  aria-describedby={errors.role ? "invite-role-error" : undefined}
                  aria-invalid={Boolean(errors.role)}
                  disabled={isPending}
                  {...register("role")}
                >
                  <option value="editor">편집자 · 일정 편집 가능</option>
                  <option value="viewer">보기 전용 · 일정 확인만 가능</option>
                </NativeSelect>
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

              <TripMembers
                canManageMembers
                currentUserId={currentUserId}
                members={members}
                tripId={tripId}
              />

              <PendingTripInvitations invitations={invitations} tripId={tripId} />

              <div className="dialog-actions form-field-wide">
                <Dialog.Close className="secondary-button" type="button" disabled={isPending}>
                  닫기
                </Dialog.Close>
                <button className="primary-button" type="submit" disabled={isPending}>
                  {isPending ? "초대 보내는 중…" : "초대 보내기"}
                </button>
              </div>
            </form>
          ) : (
            <div className="trip-sharing-members-only">
              <TripMembers
                canManageMembers={false}
                currentUserId={currentUserId}
                members={members}
                tripId={tripId}
              />
              <div className="dialog-actions">
                <Dialog.Close className="secondary-button" type="button">
                  닫기
                </Dialog.Close>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
