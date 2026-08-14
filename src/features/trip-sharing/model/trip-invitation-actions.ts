"use server";

import { createHash, randomBytes } from "node:crypto";

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
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { publicEnv } from "@/shared/config/public-env";

const invitationLookupSchema = z.object({
  id: z.uuid(),
  trip_id: z.uuid(),
});

function getTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString();
  const { error } = await supabase.from("trip_invitations").insert({
    created_by: user.id,
    email: inputResult.data.email,
    expires_at: expiresAt,
    role: inputResult.data.role,
    token_hash: getTokenHash(token),
    trip_id: inputResult.data.tripId,
  });

  if (error) {
    return {
      message: "초대를 만들지 못했습니다. 이미 초대했거나 권한이 없을 수 있어요.",
      status: "error",
    };
  }

  revalidatePath(`/trips/${inputResult.data.tripId}`);

  return {
    invitationUrl: new URL(`/invites/${token}`, publicEnv.NEXT_PUBLIC_APP_URL).toString(),
    message: "초대 링크를 만들었어요. 이 링크는 7일 동안 유효합니다.",
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
    .eq("token_hash", getTokenHash(tokenResult.data))
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
