"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/shared/lib/zod";

import { parseRespondToTripInvitationFormData } from "@/entities/trip/model/trip-invitation";
import type { TripInvitationNotificationActionState } from "@/features/notifications/model/trip-invitation-notification-action-state";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export async function respondToTripInvitation(
  _previousState: TripInvitationNotificationActionState,
  formData: FormData,
): Promise<TripInvitationNotificationActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent("/notifications")}`);
  }

  const inputResult = parseRespondToTripInvitationFormData(formData);

  if (!inputResult.success) {
    return { message: "처리할 초대를 다시 확인해 주세요.", status: "error" };
  }

  const { data, error } = await supabase.rpc("respond_to_trip_invitation", {
    invitation_response: inputResult.data.response,
    target_invitation_id: inputResult.data.invitationId,
  });

  if (error) {
    return {
      message: "초대가 만료되었거나 이미 처리됐어요. 알림을 새로고침해 주세요.",
      status: "error",
    };
  }

  const tripIdResult = z.uuid().safeParse(data);

  if (!tripIdResult.success) {
    return { message: "초대 결과를 확인하지 못했습니다.", status: "error" };
  }

  revalidatePath("/notifications");
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripIdResult.data}`);

  if (inputResult.data.response === "accepted") {
    redirect(`/trips/${tripIdResult.data}`);
  }

  return { message: "초대를 거절했어요.", status: "success" };
}
