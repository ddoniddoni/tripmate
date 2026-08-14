"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import type { TripMember } from "@/entities/trip/model/trip-membership";
import type { TripMemberActionResult } from "@/features/trip-sharing/model/trip-member-action-state";
import {
  removeTripMember,
  updateTripMemberRole,
} from "@/features/trip-sharing/model/trip-member-actions";

type TripMembersProps = {
  currentUserId: string;
  members: readonly TripMember[];
  tripId: string;
};

type EditableTripMemberRole = "editor" | "viewer";

function getMemberLabels(members: readonly TripMember[], currentUserId: string) {
  const labels = new Map<string, string>();
  let companionCount = 0;

  for (const member of members) {
    if (member.userId === currentUserId) {
      labels.set(member.userId, "나");
      continue;
    }

    companionCount += 1;
    labels.set(member.userId, `동행인 ${companionCount}`);
  }

  return labels;
}

function getRoleLabel(role: TripMember["role"]) {
  if (role === "owner") {
    return "소유자";
  }

  return role === "editor" ? "편집자" : "보기 전용";
}

function createMemberFormData(
  tripId: string,
  memberId: string,
  role?: EditableTripMemberRole,
) {
  const formData = new FormData();
  formData.set("memberId", memberId);
  formData.set("tripId", tripId);

  if (role) {
    formData.set("role", role);
  }

  return formData;
}

export function TripMembers({ currentUserId, members, tripId }: TripMembersProps) {
  const router = useRouter();
  const [message, setMessage] = useState<TripMemberActionResult | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TripMember | null>(null);

  const isMutating = pendingMemberId !== null;
  const memberLabels = getMemberLabels(members, currentUserId);

  function handleRoleChange(memberId: string, role: EditableTripMemberRole) {
    setMessage(null);
    setPendingMemberId(memberId);

    startTransition(async () => {
      try {
        const result = await updateTripMemberRole(createMemberFormData(tripId, memberId, role));
        setMessage(result);

        if (result.success) {
          router.refresh();
        }
      } catch {
        setMessage({
          message: "권한을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          success: false,
        });
      } finally {
        setPendingMemberId(null);
      }
    });
  }

  function handleRemove() {
    if (!memberToRemove) {
      return;
    }

    const memberId = memberToRemove.userId;
    setMessage(null);
    setPendingMemberId(memberId);

    startTransition(async () => {
      try {
        const result = await removeTripMember(createMemberFormData(tripId, memberId));
        setMessage(result);

        if (result.success) {
          router.refresh();
        }
      } catch {
        setMessage({
          message: "멤버를 제외하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          success: false,
        });
      } finally {
        setMemberToRemove(null);
        setPendingMemberId(null);
      }
    });
  }

  return (
    <section aria-labelledby="trip-members-heading" className="trip-members">
      <div className="trip-members-heading">
        <div>
          <h3 id="trip-members-heading">현재 멤버</h3>
          <p>편집자는 함께 계획하고, 보기 전용 멤버는 일정을 확인할 수 있어요.</p>
        </div>
        <span>{members.length}명</span>
      </div>

      <ul className="trip-members-list">
        {members.map((member) => {
          const label = memberLabels.get(member.userId) ?? "동행인";
          const isCurrentUser = member.userId === currentUserId;
          const isPending = pendingMemberId === member.userId;

          return (
            <li key={member.userId}>
              <div className="trip-member-identity">
                <span aria-hidden="true" className={`trip-member-avatar trip-member-avatar-${member.role}`}>
                  {label.slice(0, 1)}
                </span>
                <div>
                  <strong>{label}</strong>
                  <span>{isCurrentUser ? "이 여행의 소유자" : getRoleLabel(member.role)}</span>
                </div>
              </div>

              {member.role === "owner" ? (
                <span className="trip-member-role-badge">소유자</span>
              ) : (
                <div className="trip-member-controls">
                  <label className="sr-only" htmlFor={`trip-member-role-${member.userId}`}>
                    {label} 권한
                  </label>
                  <select
                    aria-label={`${label} 권한`}
                    disabled={isMutating}
                    id={`trip-member-role-${member.userId}`}
                    onChange={(event) =>
                      handleRoleChange(member.userId, event.target.value as EditableTripMemberRole)
                    }
                    value={member.role}
                  >
                    <option value="editor">편집자</option>
                    <option value="viewer">보기 전용</option>
                  </select>
                  <button
                    aria-label={`${label} 제외`}
                    className="text-action text-action-danger"
                    disabled={isMutating}
                    onClick={() => setMemberToRemove(member)}
                    type="button"
                  >
                    {isPending ? "처리 중…" : "제외"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {message ? (
        <p
          className={`form-message form-message-${message.success ? "success" : "error"}`}
          role={message.success ? "status" : "alert"}
        >
          {message.message}
        </p>
      ) : null}

      <AlertDialog.Root
        onOpenChange={(open) => {
          if (!open && !isMutating) {
            setMemberToRemove(null);
          }
        }}
        open={memberToRemove !== null}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="dialog-content alert-dialog-content">
            <span className="section-kicker">멤버 제외</span>
            <AlertDialog.Title>
              {memberToRemove
                ? `${memberLabels.get(memberToRemove.userId) ?? "동행인"}을 제외할까요?`
                : "멤버를 제외할까요?"}
            </AlertDialog.Title>
            <AlertDialog.Description className="dialog-description">
              제외된 멤버는 이 여행의 일정, 준비 항목, 경비를 더 이상 볼 수 없습니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialog.Description>
            <div className="dialog-actions">
              <AlertDialog.Cancel asChild>
                <button className="secondary-button" disabled={isMutating} type="button">
                  취소
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button className="danger-button" disabled={isMutating} onClick={handleRemove} type="button">
                  {isMutating ? "제외 중…" : "제외하기"}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
