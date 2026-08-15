"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import type { TripMember } from "@/entities/trip/model/trip-membership";
import type { TripMemberActionResult } from "@/features/trip-sharing/model/trip-member-action-state";
import {
  leaveTrip,
  removeTripMember,
  transferTripOwnership,
  updateTripMemberRole,
} from "@/features/trip-sharing/model/trip-member-actions";

function createMemberFormData(tripId: string, memberId: string, role?: "editor" | "viewer") {
  const formData = new FormData();
  formData.set("memberId", memberId);
  formData.set("tripId", tripId);

  if (role) {
    formData.set("role", role);
  }

  return formData;
}

export function useTripMemberActions(tripId: string) {
  const router = useRouter();
  const [message, setMessage] = useState<TripMemberActionResult | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [memberToLeave, setMemberToLeave] = useState<TripMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TripMember | null>(null);
  const [memberToTransfer, setMemberToTransfer] = useState<TripMember | null>(null);

  const isMutating = pendingMemberId !== null;

  function handleRoleChange(memberId: string, role: "editor" | "viewer") {
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

  function handleLeave() {
    if (!memberToLeave) {
      return;
    }

    setMessage(null);
    setPendingMemberId(memberToLeave.userId);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("tripId", tripId);
        const result = await leaveTrip(formData);
        setMessage(result);

        if (result.success) {
          router.replace("/trips");
        }
      } catch {
        setMessage({
          message: "여행에서 나가지 못했습니다. 잠시 후 다시 시도해 주세요.",
          success: false,
        });
      } finally {
        setMemberToLeave(null);
        setPendingMemberId(null);
      }
    });
  }

  function handleTransfer() {
    if (!memberToTransfer) {
      return;
    }

    const memberId = memberToTransfer.userId;
    setMessage(null);
    setPendingMemberId(memberId);

    startTransition(async () => {
      try {
        const result = await transferTripOwnership(createMemberFormData(tripId, memberId));
        setMessage(result);

        if (result.success) {
          router.refresh();
        }
      } catch {
        setMessage({
          message: "소유권을 넘기지 못했습니다. 잠시 후 다시 시도해 주세요.",
          success: false,
        });
      } finally {
        setMemberToTransfer(null);
        setPendingMemberId(null);
      }
    });
  }

  function handleLeaveDialogOpenChange(open: boolean) {
    if (!open && !isMutating) {
      setMemberToLeave(null);
    }
  }

  function handleRemoveDialogOpenChange(open: boolean) {
    if (!open && !isMutating) {
      setMemberToRemove(null);
    }
  }

  function handleTransferDialogOpenChange(open: boolean) {
    if (!open && !isMutating) {
      setMemberToTransfer(null);
    }
  }

  return {
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
  };
}
