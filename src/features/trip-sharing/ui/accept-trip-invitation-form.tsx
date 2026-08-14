"use client";

import { useActionState } from "react";

import { acceptTripInvitation } from "@/features/trip-sharing/model/trip-invitation-actions";
import { initialAcceptTripInvitationActionState } from "@/features/trip-sharing/model/trip-invitation-action-state";

type AcceptTripInvitationFormProps = {
  token: string;
};

export function AcceptTripInvitationForm({ token }: AcceptTripInvitationFormProps) {
  const [state, formAction, isPending] = useActionState(
    acceptTripInvitation,
    initialAcceptTripInvitationActionState,
  );

  return (
    <form action={formAction} className="invitation-accept-form">
      <input name="token" type="hidden" value={token} />
      <button type="submit" disabled={isPending}>
        {isPending ? "초대를 수락하는 중…" : "여행에 참여하기"}
      </button>
      {state.status === "error" ? (
        <p role="alert">{state.message}</p>
      ) : null}
    </form>
  );
}
