"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { initialTripInvitationNotificationActionState } from "@/features/notifications/model/trip-invitation-notification-action-state";
import { respondToTripInvitation } from "@/features/notifications/model/trip-invitation-notification-actions";

type TripInvitationNotificationActionsProps = {
  invitationId: string;
};

export function TripInvitationNotificationActions({
  invitationId,
}: TripInvitationNotificationActionsProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    respondToTripInvitation,
    initialTripInvitationNotificationActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="notification-response-form">
      <input name="invitationId" type="hidden" value={invitationId} />
      <div className="notification-response-actions">
        <button
          className="secondary-button"
          disabled={isPending}
          name="response"
          type="submit"
          value="declined"
        >
          {isPending ? "처리 중…" : "거절"}
        </button>
        <button
          className="primary-button"
          disabled={isPending}
          name="response"
          type="submit"
          value="accepted"
        >
          {isPending ? "처리 중…" : "수락"}
        </button>
      </div>
      {state.status !== "idle" ? (
        <p
          className={`form-message form-message-${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
