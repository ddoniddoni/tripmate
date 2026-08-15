"use client";

import { getTripMemberLabels } from "@/entities/trip/lib/get-trip-member-labels";
import type { TripMember } from "@/entities/trip/model/trip-membership";
import {
  MemberRemovalDialog,
  OwnershipTransferDialog,
  TripLeaveDialog,
} from "@/features/trip-sharing/ui/trip-member-action-dialogs";
import { TripMemberRow } from "@/features/trip-sharing/ui/trip-member-row";
import { useTripMemberActions } from "@/features/trip-sharing/ui/use-trip-member-actions";

type TripMembersProps = {
  canManageMembers: boolean;
  currentUserId: string;
  members: readonly TripMember[];
  tripId: string;
};

export function TripMembers({ canManageMembers, currentUserId, members, tripId }: TripMembersProps) {
  const {
    handleLeave,
    handleLeaveDialogOpenChange,
    handleRemove,
    handleRemoveDialogOpenChange,
    handleRoleChange,
    handleTransfer,
    handleTransferDialogOpenChange,
    isMutating,
    memberToLeave,
    memberToRemove,
    memberToTransfer,
    message,
    pendingMemberId,
    setMemberToLeave,
    setMemberToRemove,
    setMemberToTransfer,
  } = useTripMemberActions(tripId);
  const memberLabels = getTripMemberLabels(members, currentUserId);

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
          const label = memberLabels.get(member.userId) ?? "여행 멤버";

          return (
            <TripMemberRow
              canManageMembers={canManageMembers}
              isCurrentUser={member.userId === currentUserId}
              isMutating={isMutating}
              isPending={pendingMemberId === member.userId}
              key={member.userId}
              label={label}
              member={member}
              onLeave={setMemberToLeave}
              onRemove={setMemberToRemove}
              onRoleChange={handleRoleChange}
              onTransfer={setMemberToTransfer}
            />
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

      <MemberRemovalDialog
        isMutating={isMutating}
        member={memberToRemove}
        memberLabel={memberToRemove ? (memberLabels.get(memberToRemove.userId) ?? "여행 멤버") : "여행 멤버"}
        onConfirm={handleRemove}
        onOpenChange={handleRemoveDialogOpenChange}
        open={memberToRemove !== null}
      />
      <OwnershipTransferDialog
        isMutating={isMutating}
        member={memberToTransfer}
        memberLabel={
          memberToTransfer ? (memberLabels.get(memberToTransfer.userId) ?? "여행 멤버") : "여행 멤버"
        }
        onConfirm={handleTransfer}
        onOpenChange={handleTransferDialogOpenChange}
        open={memberToTransfer !== null}
      />
      <TripLeaveDialog
        isMutating={isMutating}
        onConfirm={handleLeave}
        onOpenChange={handleLeaveDialogOpenChange}
        open={memberToLeave !== null}
      />
    </section>
  );
}
