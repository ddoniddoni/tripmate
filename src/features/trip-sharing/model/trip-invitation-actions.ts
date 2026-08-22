"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/shared/lib/zod";

import {
  parseCreateTripInvitationFormData,
  parseRevokeTripInvitationFormData,
  tripInvitationTokenSchema,
} from "@/entities/trip/model/trip-invitation";
import type {
  AcceptTripInvitationActionState,
  CreateTripInvitationActionState,
  RevokeTripInvitationActionResult,
} from "@/features/trip-sharing/model/trip-invitation-action-state";
import { getTripInvitationTokenHash } from "@/features/trip-sharing/lib/trip-invitation-token";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const invitationLookupSchema = z.object({
  id: z.uuid(),
  trip_id: z.uuid(),
});

function getCreateInvitationErrorMessage(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "";

  if (message.includes("INVITEE_NOT_FOUND")) {
    return "아직 TripMate에 가입하지 않은 이메일이에요.";
  }

  if (message.includes("CANNOT_INVITE_SELF")) {
    return "내 계정은 여행에 초대할 수 없어요.";
  }

  if (message.includes("ALREADY_TRIP_MEMBER")) {
    return "이미 이 여행에 참여하고 있는 계정이에요.";
  }

  if (message.includes("INVITATION_ALREADY_PENDING")) {
    return "이미 응답을 기다리는 초대가 있어요.";
  }

  if (message.includes("NOT_TRIP_OWNER")) {
    return "여행 소유자만 멤버를 초대할 수 있어요.";
  }

  return "초대를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function createTripInvitation(
  _previousState: CreateTripInvitationActionState,
  formData: FormData,
): Promise<CreateTripInvitationActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const inputResult = parseCreateTripInvitationFormData(formData);

  if (!inputResult.success) {
    return {
      message: inputResult.error.issues[0]?.message ?? "초대 정보를 확인해 주세요.",
      status: "error",
    };
  }

  const { error } = await supabase.rpc("create_trip_invitation_for_registered_user", {
    target_email: inputResult.data.email,
    target_role: inputResult.data.role,
    target_trip_id: inputResult.data.tripId,
  });

  if (error) {
    return {
      message: getCreateInvitationErrorMessage(error),
      status: "error",
    };
  }

  revalidatePath(`/trips/${inputResult.data.tripId}`);

  return {
    message: `${inputResult.data.email}님에게 초대를 보냈어요. 알림에서 바로 확인할 수 있어요.`,
    status: "success",
  };
}

export async function revokeTripInvitation(
  formData: FormData,
): Promise<RevokeTripInvitationActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const inputResult = parseRevokeTripInvitationFormData(formData);

  if (!inputResult.success) {
    return { message: "취소할 초대 정보를 확인해 주세요.", success: false };
  }

  const { data, error } = await supabase
    .from("trip_invitations")
    .delete()
    .eq("id", inputResult.data.invitationId)
    .eq("trip_id", inputResult.data.tripId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      message: "초대를 취소하지 못했습니다. 권한을 다시 확인해 주세요.",
      success: false,
    };
  }

  revalidatePath(`/trips/${inputResult.data.tripId}`);
  return { message: "대기 중인 초대를 취소했습니다.", success: true };
}

export async function acceptTripInvitation(
  _previousState: AcceptTripInvitationActionState,
  formData: FormData,
): Promise<AcceptTripInvitationActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const tokenResult = tripInvitationTokenSchema.safeParse(formData.get("token"));

  if (!tokenResult.success) {
    return { message: "초대 링크가 올바르지 않습니다.", status: "error" };
  }

  const { data, error } = await supabase
    .from("trip_invitations")
    .select("id, trip_id")
    .eq("token_hash", getTripInvitationTokenHash(tokenResult.data))
    .maybeSingle();

  if (error) {
    return { message: "초대를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: "error" };
  }

  const invitationResult = invitationLookupSchema.safeParse(data);

  if (!invitationResult.success) {
    return {
      message: "초대 링크가 만료되었거나 다른 이메일 주소로 발급되었습니다.",
      status: "error",
    };
  }

  const { error: acceptanceError } = await supabase.from("trip_invitation_acceptances").insert({
    invitation_id: invitationResult.data.id,
    user_id: user.id,
  });

  if (acceptanceError) {
    return {
      message: "초대를 수락하지 못했습니다. 링크의 이메일과 로그인 이메일이 같은지 확인해 주세요.",
      status: "error",
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${invitationResult.data.trip_id}`);
  redirect(`/trips/${invitationResult.data.trip_id}`);
}
