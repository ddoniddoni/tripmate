"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import {
  isTripInvitationExpired,
  type TripInvitation,
} from "@/entities/trip/model/trip-invitation";
import { revokeTripInvitation } from "@/features/trip-sharing/model/trip-invitation-actions";
import type { RevokeTripInvitationActionResult } from "@/features/trip-sharing/model/trip-invitation-action-state";

type PendingTripInvitationsProps = {
  invitations: TripInvitation[];
  tripId: string;
};

const expiryDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "numeric",
  timeZone: "Asia/Seoul",
});

function formatExpiry(expiresAt: string) {
  return expiryDateFormatter.format(new Date(expiresAt));
}

function getRoleLabel(role: TripInvitation["role"]) {
  return role === "editor" ? "편집자" : "보기 전용";
}

export function PendingTripInvitations({
  invitations,
  tripId,
}: PendingTripInvitationsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<RevokeTripInvitationActionResult | null>(null);
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null);

  function handleRevoke(invitationId: string) {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    formData.set("tripId", tripId);
    setMessage(null);
    setPendingInvitationId(invitationId);

    startTransition(async () => {
      try {
        const result = await revokeTripInvitation(formData);

        setMessage(result);

        if (result.success) {
          router.refresh();
        }
      } catch {
        setMessage({
          message: "초대를 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          success: false,
        });
      } finally {
        setPendingInvitationId(null);
      }
    });
  }

  return (
    <section className="pending-invitations" aria-labelledby="pending-invitations-heading">
      <div className="pending-invitations-heading">
        <h3 id="pending-invitations-heading">대기 중인 초대</h3>
        <span>{invitations.length}개</span>
      </div>

      {invitations.length === 0 ? (
        <p className="pending-invitations-empty">현재 대기 중인 초대가 없어요.</p>
      ) : (
        <ul className="pending-invitations-list">
          {invitations.map((invitation) => {
            const expired = isTripInvitationExpired(invitation);
            const isPending = pendingInvitationId === invitation.id;

            return (
              <li key={invitation.id}>
                <div>
                  <strong>{invitation.email}</strong>
                  <span>
                    {getRoleLabel(invitation.role)} · {expired ? "만료됨" : `${formatExpiry(invitation.expiresAt)}까지`}
                  </span>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={pendingInvitationId !== null}
                  onClick={() => handleRevoke(invitation.id)}
                >
                  {isPending ? "취소 중…" : expired ? "삭제" : "초대 취소"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {message ? (
        <p
          className={`form-message form-message-${message.success ? "success" : "error"}`}
          role={message.success ? "status" : "alert"}
        >
          {message.message}
        </p>
      ) : null}
    </section>
  );
}
